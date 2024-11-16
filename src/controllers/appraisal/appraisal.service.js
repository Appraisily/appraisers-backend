const { 
  sheetsService, 
  wordpressService,
  pubsubService,
  emailService,
  openaiService 
} = require('../../services');
const { config } = require('../../config');
const { getImageUrl } = require('../../utils/getImageUrl');
const fetch = require('node-fetch');

class AppraisalService {
  // Get all appraisals
  async getAppraisals() {
    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!A2:H`
    );

    return (values || []).map((row, index) => ({
      id: index + 2,
      date: row[0] || '',
      appraisalType: row[1] || '',
      identifier: row[2] || '',
      status: row[5] || '',
      wordpressUrl: row[6] || '',
      iaDescription: row[7] || '',
    }));
  }

  // Get completed appraisals
  async getCompletedAppraisals() {
    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      'Completed Appraisals!A2:H'
    );

    return (values || []).map((row, index) => ({
      id: index + 2,
      date: row[0] || '',
      appraisalType: row[1] || '',
      identifier: row[2] || '',
      status: row[5] || '',
      wordpressUrl: row[6] || '',
      iaDescription: row[7] || '',
    }));
  }

  // Get specific appraisal details
  async getDetails(id) {
    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!A${id}:I${id}`
    );

    const row = values[0];
    if (!row) {
      throw new Error('Appraisal not found');
    }

    const appraisal = {
      id,
      date: row[0] || '',
      appraisalType: row[1] || '',
      identifier: row[2] || '',
      customerEmail: row[3] || '',
      customerName: row[4] || '',
      status: row[5] || '',
      wordpressUrl: row[6] || '',
      iaDescription: row[7] || '',
      customerDescription: row[8] || '',
    };

    const postId = new URL(appraisal.wordpressUrl).searchParams.get('post');
    if (!postId) {
      throw new Error('Invalid WordPress URL');
    }

    const wpData = await wordpressService.getPost(postId);
    const acfFields = wpData.acf || {};

    appraisal.images = {
      main: await getImageUrl(acfFields.main),
      age: await getImageUrl(acfFields.age),
      signature: await getImageUrl(acfFields.signature),
    };

    return appraisal;
  }

  // Set appraisal value
  async setValue(id, appraisalValue, description, isEdit = false) {
    const sheetName = isEdit ? config.EDIT_SHEET_NAME : config.GOOGLE_SHEET_NAME;

    // Update Google Sheets
    await sheetsService.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${sheetName}!J${id}:K${id}`,
      [[appraisalValue, description]]
    );

    // Get WordPress URL
    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${sheetName}!G${id}`
    );

    const wordpressUrl = values[0][0];
    const postId = new URL(wordpressUrl).searchParams.get('post');

    // Update WordPress
    await wordpressService.updatePost(postId, {
      acf: { value: appraisalValue }
    });
  }

  // Merge descriptions
  async mergeDescriptions(id, appraiserDescription) {
    // Get IA description from sheets
    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!H${id}`
    );

    const iaDescription = values[0][0];
    if (!iaDescription) {
      throw new Error('IA description not found');
    }

    // Generate merged description using OpenAI
    const completion = await openaiService.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Merge the appraiser and AI descriptions into a single, cohesive paragraph. Prefer the appraiser's description in case of contradictions. Keep it under 350 characters."
        },
        {
          role: "user",
          content: `Appraiser: ${appraiserDescription}\nAI: ${iaDescription}`
        }
      ]
    });

    const mergedDescription = completion.choices[0].message.content.trim();

    // Save merged description
    await sheetsService.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!L${id}`,
      [[mergedDescription]]
    );

    return mergedDescription;
  }

  // Update post title
  async updateTitle(id) {
    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!A${id}:L${id}`
    );

    const row = values[0];
    if (!row) {
      throw new Error('Appraisal not found');
    }

    const wordpressUrl = row[6];
    const blendedDescription = row[11];

    if (!wordpressUrl || !blendedDescription) {
      throw new Error('Required data missing');
    }

    const postId = new URL(wordpressUrl).searchParams.get('post');
    if (!postId) {
      throw new Error('Invalid WordPress URL');
    }

    await wordpressService.updatePost(postId, {
      title: blendedDescription
    });

    return postId;
  }

  // Insert template
  async insertTemplate(id) {
    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!A${id}:G${id}`
    );

    const row = values[0];
    if (!row) {
      throw new Error('Appraisal not found');
    }

    const appraisalType = row[1] || 'RegularArt';
    const wordpressUrl = row[6];

    if (!wordpressUrl) {
      throw new Error('WordPress URL not found');
    }

    const postId = new URL(wordpressUrl).searchParams.get('post');
    if (!postId) {
      throw new Error('Invalid WordPress URL');
    }

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

  // Build PDF
  async buildPdf(id) {
    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!A${id}:G${id}`
    );

    const row = values[0];
    if (!row) {
      throw new Error('Appraisal not found');
    }

    const wordpressUrl = row[6];
    const postId = new URL(wordpressUrl).searchParams.get('post');

    // Get session_ID from WordPress
    const wpData = await wordpressService.getPost(postId);
    const session_ID = wpData.acf?.session_id;
    if (!session_ID) {
      throw new Error('session_ID not found');
    }

    // Generate PDF
    const pdfResponse = await fetch(
      'https://appraisals-backend-856401495068.us-central1.run.app/generate-pdf',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, session_ID })
      }
    );

    if (!pdfResponse.ok) {
      throw new Error('Failed to generate PDF');
    }

    const pdfData = await pdfResponse.json();
    if (!pdfData.success) {
      throw new Error(pdfData.message || 'Failed to generate PDF');
    }

    // Update sheets with links
    await sheetsService.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!M${id}:N${id}`,
      [[pdfData.pdfLink, pdfData.docLink]]
    );

    return {
      pdfLink: pdfData.pdfLink,
      docLink: pdfData.docLink
    };
  }

  // Send email
  async sendEmail(id) {
    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!A${id}:N${id}`
    );

    const row = values[0];
    if (!row) {
      throw new Error('Appraisal not found');
    }

    const customerEmail = row[3];
    const customerName = row[4];
    const wordpressUrl = row[6];
    const appraisalValue = row[9];
    const description = row[10];
    const pdfLink = row[12];

    if (!customerEmail || !wordpressUrl) {
      throw new Error('Required data missing');
    }

    const postId = new URL(wordpressUrl).searchParams.get('post');
    if (!postId) {
      throw new Error('Invalid WordPress URL');
    }

    // Get public URL from WordPress
    const wpData = await wordpressService.getPost(postId);
    const publicUrl = wpData.link;

    await emailService.sendAppraisalCompletedEmail(customerEmail, customerName, {
      value: appraisalValue,
      description: description,
      pdfLink: pdfLink,
      publicUrl: publicUrl
    });
  }

  // Complete appraisal
  async complete(id, appraisalValue, description) {
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
      [[appraisalValue, description]]
    );
  }

  // Process appraisal
  async processAppraisal(id, appraisalValue, description) {
    await this.setValue(id, appraisalValue, description);
    await this.mergeDescriptions(id, description);
    const postId = await this.updateTitle(id);
    await this.insertTemplate(id);
    await this.buildPdf(id);
    await this.sendEmail(id);
    await this.complete(id, appraisalValue, description);
  }
}

module.exports = new AppraisalService();