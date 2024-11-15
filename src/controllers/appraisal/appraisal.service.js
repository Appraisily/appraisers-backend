const { 
  sheetsService, 
  wordpressService,
  pubsubService 
} = require('../../services');
const { config } = require('../../config');
const { getImageUrl } = require('../../utils/getImageUrl');

class AppraisalService {
  async getPendingAppraisals() {
    // Initialize sheets if needed
    if (!sheetsService.sheets) {
      await sheetsService.initialize();
    }

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
    // Initialize sheets if needed
    if (!sheetsService.sheets) {
      await sheetsService.initialize();
    }

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
    try {
      // Initialize sheets if needed
      if (!sheetsService.sheets) {
        await sheetsService.initialize();
      }

      // Initialize WordPress if needed
      if (!wordpressService.isAvailable) {
        await wordpressService.initialize();
      }

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

      // Extract WordPress post ID
      const postId = this.extractPostId(appraisal.wordpressUrl);
      if (!postId) {
        throw new Error('Invalid WordPress URL');
      }

      // Get WordPress data
      const wpData = await wordpressService.getPost(postId);
      const acfFields = wpData.acf || {};
      
      if (forEdit) {
        appraisal.acfFields = acfFields;
      }

      // Get image URLs
      appraisal.images = {
        main: await getImageUrl(acfFields.main),
        age: await getImageUrl(acfFields.age),
        signature: await getImageUrl(acfFields.signature),
      };

      return appraisal;
    } catch (error) {
      console.error('Error getting appraisal details:', error);
      throw new Error(`Failed to get appraisal details: ${error.message}`);
    }
  }

  async setAppraisalValue(id, value, description, isEdit = false) {
    try {
      // Initialize services if needed
      if (!sheetsService.sheets) {
        await sheetsService.initialize();
      }
      if (!wordpressService.isAvailable) {
        await wordpressService.initialize();
      }

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
      const postId = this.extractPostId(wordpressUrl);

      // Update WordPress
      await wordpressService.updatePost(postId, {
        acf: { value }
      });
    } catch (error) {
      console.error('Error setting appraisal value:', error);
      throw new Error(`Failed to set appraisal value: ${error.message}`);
    }
  }

  async startCompletionProcess(id, value, description) {
    try {
      if (!pubsubService.isAvailable) {
        await pubsubService.initialize();
      }

      await pubsubService.publishMessage('appraisal-tasks', {
        id,
        appraisalValue: value,
        description
      });
    } catch (error) {
      console.error('Error starting completion process:', error);
      throw new Error(`Failed to start completion process: ${error.message}`);
    }
  }

  async processWorkerTask(id, value, description) {
    try {
      // Initialize services
      if (!sheetsService.sheets) {
        await sheetsService.initialize();
      }
      if (!wordpressService.isAvailable) {
        await wordpressService.initialize();
      }

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
      const postId = this.extractPostId(wordpressUrl);

      // Update WordPress
      await wordpressService.updatePost(postId, {
        acf: { value }
      });
    } catch (error) {
      console.error('Error processing worker task:', error);
      throw new Error(`Failed to process worker task: ${error.message}`);
    }
  }

  // Helper method to extract post ID from WordPress URL
  extractPostId(url) {
    try {
      return new URL(url).searchParams.get('post');
    } catch (error) {
      console.error('Error extracting post ID:', error);
      return null;
    }
  }
}

module.exports = new AppraisalService();