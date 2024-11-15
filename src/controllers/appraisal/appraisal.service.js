const { 
  sheetsService, 
  wordpressService,
  pubsubService,
  emailService 
} = require('../../services');
const { config } = require('../../config');
const { getImageUrl } = require('../../utils/getImageUrl');

class AppraisalService {
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

  async completeProcess(id, appraisalValue, description) {
    try {
      console.log('🔄 Starting appraisal completion process...');

      // Validate input
      if (!id || !appraisalValue || !description) {
        throw new Error('Missing required fields for completion');
      }

      // Initialize PubSub if needed
      if (!pubsubService.isAvailable) {
        await pubsubService.initialize();
      }

      // Prepare message data
      const messageData = {
        id,
        appraisalValue,
        description,
        timestamp: new Date().toISOString()
      };

      // Publish to PubSub
      const messageId = await pubsubService.publishMessage('appraisal-tasks', messageData);
      console.log(`✓ Published completion task with ID: ${messageId}`);

      // Update status in sheets
      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!F${id}`,
        [['Processing']]
      );

      return messageId;
    } catch (error) {
      console.error('❌ Error in completeProcess:', error);
      throw new Error(`Failed to start completion process: ${error.message}`);
    }
  }
}

module.exports = new AppraisalService();