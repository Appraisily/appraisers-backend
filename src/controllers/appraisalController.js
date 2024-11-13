const { PubSub } = require('@google-cloud/pubsub');
const { config } = require('../config');
const { initializeSheets } = require('../services/googleSheets');
const emailService = require('../services/emailService');
const fetch = require('node-fetch');

class AppraisalController {
  static async getAppraisals(req, res) {
    try {
      console.log('🔍 [getAppraisals] Starting to fetch appraisals...');
      console.log('📊 [getAppraisals] Config:', {
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        sheetName: config.GOOGLE_SHEET_NAME
      });

      const sheets = await initializeSheets();
      console.log('📝 [getAppraisals] Google Sheets initialized');

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range: `${config.GOOGLE_SHEET_NAME}!A2:H`,
      });

      const rows = response.data.values || [];
      console.log(`📋 [getAppraisals] Retrieved ${rows.length} rows from spreadsheet`);

      const appraisals = rows.map((row, index) => {
        const appraisal = {
          id: index + 2,
          date: row[0] || '',
          appraisalType: row[1] || '',
          identifier: row[2] || '',
          status: row[5] || '',
          wordpressUrl: row[6] || '',
          iaDescription: row[7] || '',
        };
        console.log(`📌 [getAppraisals] Mapped row ${index + 2}:`, appraisal);
        return appraisal;
      });

      console.log(`✅ [getAppraisals] Successfully mapped ${appraisals.length} appraisals`);
      res.json(appraisals);
    } catch (error) {
      console.error('❌ [getAppraisals] Error:', error);
      console.error('Stack trace:', error.stack);
      res.status(500).json({ 
        success: false, 
        message: 'Error getting appraisals.',
        error: error.message 
      });
    }
  }

  // Rest of the controller methods remain the same...
  static async getCompletedAppraisals(req, res) {
    try {
      const sheets = await initializeSheets();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range: 'Completed Appraisals!A2:H',
      });

      const rows = response.data.values || [];
      const completedAppraisals = rows.map((row, index) => ({
        id: index + 2,
        date: row[0] || '',
        appraisalType: row[1] || '',
        identifier: row[2] || '',
        status: row[5] || '',
        wordpressUrl: row[6] || '',
        iaDescription: row[7] || '',
      }));

      res.json(completedAppraisals);
    } catch (error) {
      console.error('Error getting completed appraisals:', error);
      res.status(500).json({ success: false, message: 'Error getting completed appraisals.' });
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
        main: await getImageUrl(acfFields.main),
        age: await getImageUrl(acfFields.age),
        signature: await getImageUrl(acfFields.signature),
      };

      res.json(appraisal);
    } catch (error) {
      console.error('Error getting appraisal details:', error);
      res.status(500).json({ success: false, message: 'Error getting appraisal details.' });
    }
  }

  // ... rest of the controller methods remain unchanged
}

module.exports = AppraisalController;