const { 
  sheetsService, 
  pubsubService,
  emailService,
  wordpressService
} = require('../services');
const { config } = require('../config');
const { getImageUrl } = require('../utils/getImageUrl');

class AppraisalController {
  static async getAppraisals(req, res) {
    try {
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!A2:H`
      );

      const appraisals = values.map((row, index) => ({
        id: index + 2,
        date: row[0] || '',
        appraisalType: row[1] || '',
        identifier: row[2] || '',
        status: row[5] || '',
        wordpressUrl: row[6] || '',
        iaDescription: row[7] || '',
      }));

      res.json(appraisals);
    } catch (error) {
      console.error('Error getting appraisals:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error getting appraisals.' 
      });
    }
  }

  static async getAppraisalDetails(req, res) {
    const { id } = req.params;
    try {
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

      const wordpressUrl = row[6];
      const parsedUrl = new URL(wordpressUrl);
      const postId = parsedUrl.searchParams.get('post');

      if (!postId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Could not extract WordPress post ID.' 
        });
      }

      const wpData = await wordpressService.getPost(postId);
      const acfFields = wpData.acf || {};

      const appraisal = {
        id,
        date: row[0] || '',
        appraisalType: row[1] || '',
        identifier: row[2] || '',
        status: row[5] || '',
        wordpressUrl: row[6] || '',
        iaDescription: row[7] || '',
        customerDescription: row[8] || '',
        images: {
          main: await getImageUrl(acfFields.main),
          age: await getImageUrl(acfFields.age),
          signature: await getImageUrl(acfFields.signature),
        }
      };

      res.json(appraisal);
    } catch (error) {
      console.error('Error getting appraisal details:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error getting appraisal details.' 
      });
    }
  }

  // Add other controller methods here...
}

module.exports = AppraisalController;