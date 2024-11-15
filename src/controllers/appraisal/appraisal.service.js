const { 
  sheetsService, 
  wordpressService,
  pubsubService 
} = require('../../services');
const { config } = require('../../config');
const { getImageUrl } = require('../../utils/getImageUrl');

class AppraisalService {
  async getPendingAppraisals() {
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

  async getAppraisalDetails(id, forEdit = false) {
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
    
    if (forEdit) {
      appraisal.acfFields = wpData.acf || {};
    }

    appraisal.images = {
      main: await getImageUrl(wpData.acf?.main),
      age: await getImageUrl(wpData.acf?.age),
      signature: await getImageUrl(wpData.acf?.signature),
    };

    return appraisal;
  }

  async setAppraisalValue(id, value, description, isEdit = false) {
    const sheetName = isEdit ? config.EDIT_SHEET_NAME : config.GOOGLE_SHEET_NAME;

    // Update sheets
    await sheetsService.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${sheetName}!J${id}:K${id}`,
      [[value, description]]
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
      acf: { value }
    });
  }

  async startCompletionProcess(id, value, description) {
    await pubsubService.publishMessage('appraisal-tasks', {
      id,
      appraisalValue: value,
      description
    });
  }

  async processWorkerTask(id, value, description) {
    // Update sheets
    await sheetsService.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!J${id}:K${id}`,
      [[value, description]]
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
      acf: { value }
    });
  }
}

module.exports = new AppraisalService();