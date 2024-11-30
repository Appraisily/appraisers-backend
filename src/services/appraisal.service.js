const { 
  sheetsService, 
  wordpressService,
  pubsubService,
  emailService,
  openaiService 
} = require('../../services');
const { config } = require('../../config');
const { getImageUrl } = require('../../utils/getImageUrl');

class AppraisalService {
  async processAppraisal(id, appraisalValue, description) {
    try {
      // Step 1: Set Value
      await this.setValue(id, appraisalValue, description);
      console.log('✓ Value set successfully');

      // Step 2: Merge Descriptions
      const mergedDescription = await this.mergeDescriptions(id, description);
      console.log('✓ Descriptions merged successfully');

      // Step 3: Update Title
      const postId = await this.updateTitle(id, mergedDescription);
      console.log('✓ Title updated successfully');

      // Step 4: Insert Template
      await this.insertTemplate(id);
      console.log('✓ Template inserted successfully');

      // Step 5: Build PDF
      await this.buildPdf(id);
      console.log('✓ PDF built successfully');

      // Step 6: Send Email
      await this.sendEmail(id);
      console.log('✓ Email sent successfully');

      // Step 7: Mark as Complete
      await this.complete(id, appraisalValue, description);
      console.log('✓ Appraisal marked as complete');

    } catch (error) {
      console.error('Error processing appraisal:', error);
      throw error;
    }
  }

  async setValue(id, appraisalValue, description, isEdit = false) {
    const sheetName = isEdit ? config.EDIT_SHEET_NAME : config.GOOGLE_SHEET_NAME;

    await sheetsService.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${sheetName}!J${id}:K${id}`,
      [[appraisalValue, description]]
    );

    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${sheetName}!G${id}`
    );

    const wordpressUrl = values[0][0];
    const postId = new URL(wordpressUrl).searchParams.get('post');

    await wordpressService.updatePost(postId, {
      acf: { value: appraisalValue }
    });
  }

  async mergeDescriptions(id, appraiserDescription) {
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

      // Use our OpenAI service to merge descriptions
      const mergedDescription = await openaiService.mergeDescriptions(
        appraiserDescription,
        iaDescription
      );

      // Save merged description to sheets
      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!L${id}`,
        [[mergedDescription]]
      );

      return mergedDescription;
    } catch (error) {
      console.error('Error merging descriptions:', error);
      throw error;
    }
  }

  async updateTitle(id, mergedDescription) {
    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!G${id}`
    );

    const wordpressUrl = values[0][0];
    const postId = new URL(wordpressUrl).searchParams.get('post');

    await wordpressService.updatePost(postId, {
      title: mergedDescription
    });

    return postId;
  }

  async insertTemplate(id) {
    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!A${id}:G${id}`
    );

    const row = values[0];
    const appraisalType = row[1] || 'RegularArt';
    const wordpressUrl = row[6];
    const postId = new URL(wordpressUrl).searchParams.get('post');

    const wpData = await wordpressService.getPost(postId);
    let content = wpData.content?.rendered || '';

    if (!content.includes('[pdf_download]')) {
      content += '\n[pdf_download]';
    }

    if (!content.includes(`[AppraisalTemplates type="${appraisalType}"]`)) {
      content += `\n[AppraisalTemplates type="${appraisalType}"]`;
    }

    await wordpressService.updatePost(postId, {
      content,
      acf: {
        shortcodes_inserted: true
      }
    });
  }

  async buildPdf(id) {
    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!A${id}:G${id}`
    );

    const row = values[0];
    const wordpressUrl = row[6];
    const postId = new URL(wordpressUrl).searchParams.get('post');

    const wpData = await wordpressService.getPost(postId);
    const session_ID = wpData.acf?.session_id;

    const response = await fetch(
      'https://appraisals-backend-856401495068.us-central1.run.app/generate-pdf',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, session_ID })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to generate PDF');
    }

    const data = await response.json();
    await sheetsService.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!M${id}:N${id}`,
      [[data.pdfLink, data.docLink]]
    );

    return {
      pdfLink: data.pdfLink,
      docLink: data.docLink
    };
  }

  async sendEmail(id) {
    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!A${id}:N${id}`
    );

    const row = values[0];
    const customerEmail = row[3];
    const customerName = row[4];
    const wordpressUrl = row[6];
    const appraisalValue = row[9];
    const description = row[10];
    const pdfLink = row[12];

    await emailService.sendAppraisalCompletedEmail(customerEmail, customerName, {
      value: appraisalValue,
      description: description,
      pdfLink: pdfLink,
      wordpressUrl: wordpressUrl
    });
  }

  async complete(id, appraisalValue, description) {
    await sheetsService.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!F${id}`,
      [['Completed']]
    );

    await sheetsService.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!J${id}:K${id}`,
      [[appraisalValue, description]]
    );
  }
}

module.exports = new AppraisalService();