const { PubSub } = require('@google-cloud/pubsub');
const { config } = require('../config');
const { initializeSheets } = require('../services/googleSheets');
const fetch = require('node-fetch');

class AppraisalController {
  static async getAppraisals(req, res) {
    try {
      const sheets = await initializeSheets();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range: `${config.GOOGLE_SHEET_NAME}!A2:H`,
      });

      const rows = response.data.values || [];
      const appraisals = rows.map((row, index) => ({
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
      const sheets = await initializeSheets();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range: `${config.GOOGLE_SHEET_NAME}!A${id}:I${id}`,
      });

      const row = response.data.values?.[0];
      if (!row) {
        return res.status(404).json({ success: false, message: 'Appraisal not found.' });
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

      const wordpressUrl = appraisal.wordpressUrl;
      const parsedUrl = new URL(wordpressUrl);
      const postId = parsedUrl.searchParams.get('post');

      if (!postId) {
        return res.status(400).json({ success: false, message: 'Could not extract WordPress post ID.' });
      }

      const wpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${postId}`;
      const authHeader = 'Basic ' + Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64');

      const wpResponse = await fetch(wpEndpoint, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
      });

      if (!wpResponse.ok) {
        return res.status(500).json({ success: false, message: 'Error getting WordPress data.' });
      }

      const wpData = await wpResponse.json();
      const acfFields = wpData.acf || {};

      appraisal.images = {
        main: acfFields.main?.url || acfFields.main,
        age: acfFields.age?.url || acfFields.age,
        signature: acfFields.signature?.url || acfFields.signature,
      };

      res.json(appraisal);
    } catch (error) {
      console.error('Error getting appraisal details:', error);
      res.status(500).json({ success: false, message: 'Error getting appraisal details.' });
    }
  }

  static async getAppraisalDetailsForEdit(req, res) {
    const { id } = req.params;
    try {
      const sheets = await initializeSheets();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range: `${config.GOOGLE_SHEET_NAME}!A${id}:I${id}`,
      });

      const row = response.data.values?.[0];
      if (!row) {
        return res.status(404).json({ success: false, message: 'Appraisal not found.' });
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

      const wordpressUrl = appraisal.wordpressUrl;
      const parsedUrl = new URL(wordpressUrl);
      const postId = parsedUrl.searchParams.get('post');

      if (!postId) {
        return res.status(400).json({ success: false, message: 'Could not extract WordPress post ID.' });
      }

      const wpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${postId}`;
      const authHeader = 'Basic ' + Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64');

      const wpResponse = await fetch(wpEndpoint, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
      });

      if (!wpResponse.ok) {
        return res.status(500).json({ success: false, message: 'Error getting WordPress data.' });
      }

      const wpData = await wpResponse.json();
      const acfFields = wpData.acf || {};

      appraisal.images = {
        main: acfFields.main?.url || acfFields.main,
        age: acfFields.age?.url || acfFields.age,
        signature: acfFields.signature?.url || acfFields.signature,
      };

      appraisal.acfFields = acfFields;

      res.json(appraisal);
    } catch (error) {
      console.error('Error getting appraisal details for edit:', error);
      res.status(500).json({ success: false, message: 'Error getting appraisal details.' });
    }
  }

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