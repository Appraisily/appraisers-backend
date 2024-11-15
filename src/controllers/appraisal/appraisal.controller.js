const { 
  sheetsService, 
  wordpressService,
  pubsubService,
  emailService 
} = require('../../services');
const { config } = require('../../config');
const { getImageUrl } = require('../../utils/getImageUrl');

class AppraisalController {
  async getDetails(req, res) {
    const { id } = req.params;
    try {
      // Initialize services if needed
      if (!wordpressService.isAvailable) {
        await wordpressService.initialize();
      }
      if (!sheetsService.sheets) {
        await sheetsService.initialize();
      }

      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!A${id}:I${id}`
      );

      const row = values[0];
      if (!row) {
        return res.status(404).json({ 
          success: false, 
          message: 'Appraisal not found.' 
        });
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

      res.json(appraisal);
    } catch (error) {
      console.error('Error getting appraisal details:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error getting appraisal details.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ... rest of the controller methods ...
}