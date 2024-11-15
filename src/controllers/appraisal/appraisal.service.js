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
  // Get all pending appraisals
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

  // Get appraisal details
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

    // Get WordPress data
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

  // Get appraisal details for editing
  async getDetailsForEdit(id) {
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

    // Get WordPress data
    const postId = new URL(appraisal.wordpressUrl).searchParams.get('post');
    if (!postId) {
      throw new Error('Invalid WordPress URL');
    }

    const wpData = await wordpressService.getPost(postId);
    appraisal.acfFields = wpData.acf || {};
    appraisal.images = {
      main: await getImageUrl(appraisal.acfFields.main),
      age: await getImageUrl(appraisal.acfFields.age),
      signature: await getImageUrl(appraisal.acfFields.signature),
    };

    return appraisal;
  }

  // Set appraisal value
  async setValue(id, { appraisalValue, description, isEdit }) {
    const sheetName = isEdit ? config.EDIT_SHEET_NAME : config.GOOGLE_SHEET_NAME;

    // Update Google Sheets
    await sheetsService.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${sheetName}!J${id}:K${id}`,
      [[appraisalValue, description]]
    );

    // Get WordPress post ID
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
  async mergeDescriptions(id, description) {
    // Get appraisal details
    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!A${id}:I${id}`
    );

    const row = values[0];
    if (!row) {
      throw new Error('Appraisal not found');
    }

    const iaDescription = row[7] || '';
    if (!iaDescription) {
      throw new Error('AI description not found');
    }

    // Initialize OpenAI if needed
    if (!openaiService.isAvailable) {
      await openaiService.initialize();
    }

    // Create prompt for merging descriptions
    const prompt = `
      Merge these two descriptions into a single, cohesive paragraph:
      
      AI Description: ${iaDescription}
      Appraiser Description: ${description}

      Rules:
      - Prefer the appraiser's description in case of contradictions
      - Keep it under 350 characters
      - Use formal language
      - Include only the merged text
    `;

    // Generate merged description
    const completion = await openaiService.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert art appraiser merging descriptions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.7
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
    // Get merged description
    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!A${id}:L${id}`
    );

    const row = values[0];
    if (!row) {
      throw new Error('Appraisal not found');
    }

    const mergedDescription = row[11];
    if (!mergedDescription) {
      throw new Error('Merged description not found');
    }

    // Get WordPress post ID
    const wordpressUrl = row[6];
    const postId = new URL(wordpressUrl).searchParams.get('post');

    // Update WordPress title
    await wordpressService.updatePost(postId, {
      title: mergedDescription
    });
  }

  // Insert template
  async insertTemplate(id) {
    // Get appraisal details
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
    const postId = new URL(wordpressUrl).searchParams.get('post');

    // Get current content
    const wpData = await wordpressService.getPost(postId);
    let content = wpData.content?.rendered || '';

    // Add shortcodes if not present
    if (!content.includes('[pdf_download]')) {
      content += '\n[pdf_download]';
    }

    if (!content.includes(`[AppraisalTemplates type="${appraisalType}"]`)) {
      content += `\n[AppraisalTemplates type="${appraisalType}"]`;
    }

    // Update WordPress
    await wordpressService.updatePost(postId, {
      content,
      acf: {
        shortcodes_inserted: true
      }
    });
  }

  // Build PDF
  async buildPdf(id) {
    // Get appraisal details
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

    // Request PDF generation
    const response = await fetch('https://appraisals-backend-856401495068.us-central1.run.app/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, session_ID })
    });

    if (!response.ok) {
      throw new Error('Failed to generate PDF');
    }

    // Get generated links
    const wpDataUpdated = await wordpressService.getPost(postId);
    const pdfLink = wpDataUpdated.acf?.pdflink;
    const docLink = wpDataUpdated.acf?.doclink;

    if (!pdfLink || !docLink) {
      throw new Error('Document links not found');
    }

    // Update sheets with links
    await sheetsService.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!M${id}:N${id}`,
      [[pdfLink, docLink]]
    );
  }

  // Send email
  async sendEmail(id) {
    // Get appraisal details
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

    // Get public URL from WordPress
    const postId = new URL(wordpressUrl).searchParams.get('post');
    const wpData = await wordpressService.getPost(postId);
    const publicUrl = wpData.link;

    // Send email
    await emailService.sendAppraisalCompletedEmail(customerEmail, customerName, {
      value: appraisalValue,
      description: description,
      pdfLink: pdfLink,
      publicUrl: publicUrl
    });
  }

  // Complete appraisal
  async complete(id, appraisalValue, description) {
    // Update status and values
    await sheetsService.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!F${id}:K${id}`,
      [['Completed', '', '', '', appraisalValue, description]]
    );
  }

  // Process worker task
  async processWorker(id, appraisalValue, description) {
    // Update sheets
    await sheetsService.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!J${id}:K${id}`,
      [[appraisalValue, description]]
    );

    // Get WordPress URL
    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!G${id}`
    );

    const wordpressUrl = values[0][0];
    const postId = new URL(wordpressUrl).searchParams.get('post');

    // Update WordPress
    await wordpressService.updatePost(postId, {
      acf: { value: appraisalValue }
    });
  }

  // Complete process (start workflow)
  async completeProcess(id, appraisalValue, description) {
    // Initialize PubSub if needed
    if (!pubsubService.isAvailable) {
      await pubsubService.initialize();
    }

    // Publish message to start workflow
    await pubsubService.publishMessage('appraisal-tasks', {
      id,
      appraisalValue,
      description
    });
  }
}

module.exports = new AppraisalService();