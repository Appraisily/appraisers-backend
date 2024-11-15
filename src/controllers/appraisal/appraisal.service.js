const { 
  sheetsService, 
  wordpressService,
  pubsubService 
} = require('../../services');
const { config } = require('../../config');
const { getImageUrl } = require('../../utils/getImageUrl');

class AppraisalService {
  async getPendingAppraisals() {
    try {
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
    } catch (error) {
      console.error('Error getting pending appraisals:', error);
      throw new Error('Failed to fetch pending appraisals');
    }
  }

  async getAppraisalDetails(id, forEdit = false) {
    try {
      // Get data from sheets
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
      let postId;
      try {
        const url = new URL(appraisal.wordpressUrl);
        postId = url.searchParams.get('post');
        if (!postId) throw new Error('Post ID not found in URL');
      } catch (error) {
        throw new Error(`Invalid WordPress URL: ${error.message}`);
      }

      // Get WordPress data
      const wpData = await wordpressService.getPost(postId);
      const acfFields = wpData.acf || {};

      // Add images
      appraisal.images = {
        main: await getImageUrl(acfFields.main),
        age: await getImageUrl(acfFields.age),
        signature: await getImageUrl(acfFields.signature),
      };

      // Add ACF fields if editing
      if (forEdit) {
        appraisal.acfFields = acfFields;
      }

      return appraisal;
    } catch (error) {
      console.error('Error getting appraisal details:', error);
      throw new Error(`Failed to get appraisal details: ${error.message}`);
    }
  }

  // ... rest of the service methods remain the same ...
}