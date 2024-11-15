const { 
  sheetsService, 
  wordpressService, 
  openaiService, 
  emailService,
  pubsubService 
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
        iaDescription: row[7] || ''
      }));

      res.json(appraisals);
    } catch (error) {
      console.error('Error getting appraisals:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error getting appraisals' 
      });
    }
  }

  static async processWorker(req, res) {
    const { id, appraisalValue, description } = req.body;

    if (!id || !appraisalValue || !description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    try {
      // Update value and description
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

      // Generate AI description
      const post = await wordpressService.getPost(postId);
      const mainImageUrl = await getImageUrl(post.acf?.main);
      
      if (mainImageUrl) {
        const iaDescription = await openaiService.generateDescription(mainImageUrl);
        
        // Update description in sheets
        await sheetsService.updateValues(
          config.PENDING_APPRAISALS_SPREADSHEET_ID,
          `${config.GOOGLE_SHEET_NAME}!H${id}`,
          [[iaDescription]]
        );

        // Update WordPress title
        await wordpressService.updatePost(postId, {
          title: iaDescription
        });
      }

      // Send email notification
      const customerEmail = values[0][3];
      const customerName = values[0][4];

      if (customerEmail) {
        await emailService.sendAppraisalCompletedEmail(
          customerEmail,
          customerName,
          {
            value: appraisalValue,
            description,
            pdfLink: post.acf?.pdflink
          }
        );
      }

      res.json({
        success: true,
        message: 'Appraisal processed successfully'
      });
    } catch (error) {
      console.error('Error processing appraisal:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error processing appraisal'
      });
    }
  }

  // Add other controller methods here...
}

module.exports = {
  getAppraisals: AppraisalController.getAppraisals,
  processWorker: AppraisalController.processWorker
  // Export other methods as needed...
};