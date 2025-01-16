const { 
  openaiService, 
  sheetsService, 
  emailService, 
  wordpressService 
} = require('../services');
const { config } = require('../config');
const aiService = require('../services/ai.service');
const { initializeSheets } = require('../services/googleSheets');
const emailService = require('../services/emailService');

class UpdatePendingAppraisalController {
  static async updatePendingAppraisal(req, res) {
    try {
      console.log('Received payload:', JSON.stringify(req.body));

      // Verify shared secret
      const incomingSecret = req.headers['x-shared-secret'];
      if (incomingSecret !== config.SHARED_SECRET) {
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden: Invalid shared secret.' 
        });
      }

      const { description, images, post_id, post_edit_url, customer_email, session_id } = req.body;

      if (!session_id || !customer_email || !post_id || typeof images !== 'object' || !post_edit_url) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required fields.' 
        });
      }

      // Send immediate response
      res.json({ 
        success: true, 
        message: 'Appraisal status update initiated.' 
      });

      // Process in background
      (async () => {
        try {
          const mainImageUrl = images.main;
          if (!mainImageUrl) {
            throw new Error('Main image URL is required.');
          }

          // Generate AI description
          const iaDescription = await aiService.generateDescription(mainImageUrl);

          // Update WordPress title
          await wordpressService.updatePost(post_id, {
            title: `Preliminary Analysis: ${iaDescription}`
          });

          // Update Google Sheets
          const sheetData = await this.updateGoogleSheets(
            session_id, 
            iaDescription, 
            description, 
            images
          );

          // Send email notification
          if (sheetData.customer_name) {
            await emailService.sendAppraisalUpdateEmail(
              customer_email,
              sheetData.customer_name,
              description,
              iaDescription
            );
          }

        } catch (error) {
          console.error('Background processing error:', error);
        }
      })();

    } catch (error) {
      console.error('Error in updatePendingAppraisal:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          success: false, 
          message: 'Internal Server Error.' 
        });
      }
    }
  }

  static async updateGoogleSheets(session_id, iaDescription, description, images) {
    // Find row with matching session_id
    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!A:O`
    );

    let rowIndex = null;
    let customer_name = '';

    for (let i = 0; i < values.length; i++) {
      if (values[i][2] === session_id) {
        rowIndex = i + 1;
        customer_name = values[i][4] || '';
        break;
      }
    }

    if (!rowIndex) {
      throw new Error(`Session ID ${session_id} not found`);
    }

    // Update IA description
    await sheetsService.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!H${rowIndex}`,
      [[iaDescription]]
    );

    // Update customer description
    await sheetsService.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!I${rowIndex}`,
      [[description || '']]
    );

    // Update images
    await sheetsService.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!O${rowIndex}`,
      [[JSON.stringify(images)]]
    );

    return { customer_name };
  }
}

module.exports = {
  updatePendingAppraisal: UpdatePendingAppraisalController.updatePendingAppraisal
};