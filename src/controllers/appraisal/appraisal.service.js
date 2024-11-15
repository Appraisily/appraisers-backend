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
    // Get sheet data
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

  // Build PDF
  async buildPdf(id) {
    try {
      console.log('🔄 Starting PDF build process for appraisal:', id);

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

      // First complete the appraisal report
      console.log('🔄 Completing appraisal report for post:', postId);
      const completeResponse = await fetch(
        'https://appraisals-backend-856401495068.us-central1.run.app/complete-appraisal-report',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId })
        }
      );

      if (!completeResponse.ok) {
        const error = await completeResponse.text();
        throw new Error(`Failed to complete appraisal report: ${error}`);
      }

      const completeData = await completeResponse.json();
      if (!completeData.success) {
        throw new Error(completeData.message || 'Failed to complete appraisal report');
      }

      console.log('✓ Appraisal report completed successfully');

      // Get session_ID from WordPress
      const wpData = await wordpressService.getPost(postId);
      const session_ID = wpData.acf?.session_id;
      if (!session_ID) {
        throw new Error('session_ID not found');
      }

      // Generate PDF
      console.log('🔄 Generating PDF documents');
      const pdfResponse = await fetch(
        'https://appraisals-backend-856401495068.us-central1.run.app/generate-pdf',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId, session_ID })
        }
      );

      if (!pdfResponse.ok) {
        const error = await pdfResponse.text();
        throw new Error(`Failed to generate PDF: ${error}`);
      }

      const pdfData = await pdfResponse.json();
      if (!pdfData.success) {
        throw new Error(pdfData.message || 'Failed to generate PDF');
      }

      console.log('✓ PDF generated successfully');
      console.log('PDF Link:', pdfData.pdfLink);
      console.log('Doc Link:', pdfData.docLink);

      // Update sheets with links
      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!M${id}:N${id}`,
        [[pdfData.pdfLink, pdfData.docLink]]
      );

      console.log('✓ Document links updated in sheets');
      return { 
        pdfLink: pdfData.pdfLink, 
        docLink: pdfData.docLink 
      };
    } catch (error) {
      console.error('❌ Error in buildPdf:', error);
      throw error;
    }
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

  // Complete process
  async completeProcess(id, appraisalValue, description) {
    await pubsubService.publishMessage('appraisal-tasks', {
      id,
      appraisalValue,
      description
    });
  }
}

module.exports = new AppraisalService();