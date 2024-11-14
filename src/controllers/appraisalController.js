const { PubSub } = require('@google-cloud/pubsub');
const { config } = require('../config');
const { initializeSheets } = require('../services/googleSheets');

class AppraisalController {
  static async completeProcess(req, res) {
    const { id } = req.params;
    const { appraisalValue, description } = req.body;

    console.log('🔄 [completeProcess] Starting appraisal process', {
      id,
      appraisalValue,
      hasDescription: !!description
    });

    if (!appraisalValue || !description) {
      console.log('❌ [completeProcess] Missing required fields');
      return res.status(400).json({ 
        success: false, 
        message: 'Appraisal value and description are required.' 
      });
    }

    try {
      // 1. Validate appraisal exists
      const sheets = await initializeSheets();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range: `${config.GOOGLE_SHEET_NAME}!A${id}:G${id}`,
      });

      if (!response.data.values || response.data.values.length === 0) {
        console.log('❌ [completeProcess] Appraisal not found:', id);
        return res.status(404).json({
          success: false,
          message: 'Appraisal not found'
        });
      }

      // 2. Initialize PubSub
      const pubsub = new PubSub({
        projectId: config.GOOGLE_CLOUD_PROJECT_ID,
      });

      // 3. Create task payload
      const task = {
        type: 'COMPLETE_APPRAISAL',
        data: {
          id,
          appraisalValue,
          description,
          timestamp: new Date().toISOString()
        }
      };

      // 4. Publish to PubSub
      const dataBuffer = Buffer.from(JSON.stringify(task));
      const messageId = await pubsub.topic('appraisal-tasks').publish(dataBuffer);

      console.log(`✅ [completeProcess] Task published successfully`, {
        messageId,
        id,
        timestamp: new Date().toISOString()
      });

      // 5. Update status in sheets
      await sheets.spreadsheets.values.update({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range: `${config.GOOGLE_SHEET_NAME}!F${id}`,
        valueInputOption: 'RAW',
        resource: {
          values: [['Processing']]
        }
      });

      // 6. Send success response
      res.json({ 
        success: true, 
        message: 'Appraisal process started successfully.',
        data: {
          messageId,
          status: 'processing'
        }
      });

    } catch (error) {
      console.error('❌ [completeProcess] Error:', error);
      res.status(500).json({ 
        success: false, 
        message: `Error submitting appraisal: ${error.message}` 
      });
    }
  }
}

module.exports = AppraisalController;