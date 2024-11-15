const { 
  sheetsService, 
  wordpressService,
  pubsubService,
  openaiService,
  emailService 
} = require('../../services');
const { config } = require('../../config');
const { getImageUrl } = require('../../utils/getImageUrl');

class AppraisalService {
  // Existing methods remain the same...

  async mergeDescriptions(id, description) {
    try {
      // Get IA description from sheets
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!H${id}`
      );

      const iaDescription = values[0][0];
      if (!iaDescription) {
        throw new Error('IA description not found');
      }

      // Use OpenAI to merge descriptions
      const prompt = `Merge these two descriptions into a single, cohesive paragraph under 350 characters:\n\nAppraiser: ${description}\nAI: ${iaDescription}`;
      const mergedDescription = await openaiService.generateDescription(prompt);

      // Save merged description
      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!L${id}`,
        [[mergedDescription]]
      );

      return mergedDescription;
    } catch (error) {
      throw new Error(`Failed to merge descriptions: ${error.message}`);
    }
  }

  async updateTitle(id) {
    try {
      // Get merged description
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!G${id}:L${id}`
      );

      const [row] = values;
      const wordpressUrl = row[0];
      const mergedDescription = row[5];

      if (!wordpressUrl || !mergedDescription) {
        throw new Error('Required data not found');
      }

      // Update WordPress title
      const postId = this.extractPostId(wordpressUrl);
      await wordpressService.updatePost(postId, {
        title: mergedDescription
      });
    } catch (error) {
      throw new Error(`Failed to update title: ${error.message}`);
    }
  }

  async insertTemplate(id) {
    try {
      // Get appraisal type and WordPress URL
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!B${id}:G${id}`
      );

      const [row] = values;
      const appraisalType = row[0] || 'RegularArt';
      const wordpressUrl = row[5];

      if (!wordpressUrl) {
        throw new Error('WordPress URL not found');
      }

      const postId = this.extractPostId(wordpressUrl);
      
      // Update WordPress content
      await wordpressService.updatePost(postId, {
        content: `[pdf_download]\n[AppraisalTemplates type="${appraisalType}"]`,
        acf: {
          shortcodes_inserted: true
        }
      });
    } catch (error) {
      throw new Error(`Failed to insert template: ${error.message}`);
    }
  }

  async buildPdf(id) {
    try {
      // Get WordPress URL and session ID
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!G${id}`
      );

      const wordpressUrl = values[0][0];
      const postId = this.extractPostId(wordpressUrl);

      // Get session ID from WordPress
      const post = await wordpressService.getPost(postId);
      const sessionId = post.acf?.session_id;

      if (!sessionId) {
        throw new Error('Session ID not found');
      }

      // Request PDF generation
      const response = await fetch('https://appraisals-backend-856401495068.us-central1.run.app/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, session_ID: sessionId })
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Update links in sheets
      const updatedPost = await wordpressService.getPost(postId);
      const pdfLink = updatedPost.acf?.pdflink;
      const docLink = updatedPost.acf?.doclink;

      if (!pdfLink || !docLink) {
        throw new Error('Document links not found');
      }

      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!M${id}:N${id}`,
        [[pdfLink, docLink]]
      );
    } catch (error) {
      throw new Error(`Failed to build PDF: ${error.message}`);
    }
  }

  async sendEmail(id) {
    try {
      // Get appraisal details
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!A${id}:N${id}`
      );

      const [row] = values;
      const customerEmail = row[3];
      const customerName = row[4];
      const wordpressUrl = row[6];
      const appraisalValue = row[9];
      const description = row[10];
      const pdfLink = row[12];

      if (!customerEmail || !wordpressUrl) {
        throw new Error('Required data missing');
      }

      // Get public URL from WordPress
      const postId = this.extractPostId(wordpressUrl);
      const post = await wordpressService.getPost(postId);
      const publicUrl = post.link;

      // Send email
      await emailService.sendAppraisalCompletedEmail(customerEmail, customerName, {
        value: appraisalValue,
        description,
        pdfLink,
        publicUrl
      });
    } catch (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async complete(id, value, description) {
    try {
      // Update status to "Completed"
      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!F${id}`,
        [['Completed']]
      );

      // Update value and description
      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!J${id}:K${id}`,
        [[value, description]]
      );
    } catch (error) {
      throw new Error(`Failed to complete appraisal: ${error.message}`);
    }
  }
}

module.exports = new AppraisalService();