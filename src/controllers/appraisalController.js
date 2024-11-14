const { PubSub } = require('@google-cloud/pubsub');
const { config } = require('../config');
const { initializeSheets } = require('../services/googleSheets');
const emailService = require('../services/emailService');
const getImageUrl = require('../utils/getImageUrl');
const fetch = require('node-fetch');
const https = require('https');

// Configure fetch to use Node.js HTTPS module with proper SSL settings
const agent = new https.Agent({
  rejectUnauthorized: false,
  secureProtocol: 'TLSv1_2_method'
});

class AppraisalController {
  // ... other methods remain the same ...

  static async getAppraisalDetails(req, res) {
    const { id } = req.params;
    try {
      console.log(`📋 [getAppraisalDetails] Fetching details for appraisal ID: ${id}`);
      
      const sheets = await initializeSheets();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range: `${config.GOOGLE_SHEET_NAME}!A${id}:I${id}`,
      });

      const row = response.data.values ? response.data.values[0] : null;
      if (!row) {
        console.log('❌ [getAppraisalDetails] Appraisal not found');
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

      console.log('📝 [getAppraisalDetails] Basic appraisal data:', appraisal);

      const wordpressUrl = appraisal.wordpressUrl;
      if (!wordpressUrl) {
        console.log('❌ [getAppraisalDetails] WordPress URL not found');
        return res.status(400).json({ success: false, message: 'WordPress URL not found.' });
      }

      const parsedUrl = new URL(wordpressUrl);
      const postId = parsedUrl.searchParams.get('post');

      if (!postId) {
        console.log('❌ [getAppraisalDetails] Could not extract WordPress post ID');
        return res.status(400).json({ success: false, message: 'Could not extract WordPress post ID.' });
      }

      console.log(`🔍 [getAppraisalDetails] Fetching WordPress post ID: ${postId}`);

      const wpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${postId}`;
      const authHeader = 'Basic ' + Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64');

      const wpResponse = await fetch(wpEndpoint, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        agent
      });

      if (!wpResponse.ok) {
        const errorText = await wpResponse.text();
        console.error('❌ [getAppraisalDetails] WordPress API error:', errorText);
        return res.status(500).json({ success: false, message: 'Error getting WordPress data.' });
      }

      const wpData = await wpResponse.json();
      const acfFields = wpData.acf || {};

      console.log('🖼️ [getAppraisalDetails] Processing image fields from ACF');

      // Process images in parallel for better performance
      const [mainImage, ageImage, signatureImage] = await Promise.all([
        getImageUrl(acfFields.main),
        getImageUrl(acfFields.age),
        getImageUrl(acfFields.signature)
      ]);

      appraisal.images = {
        main: mainImage,
        age: ageImage,
        signature: signatureImage
      };

      console.log('✅ [getAppraisalDetails] Successfully processed all images');
      console.log('🖼️ [getAppraisalDetails] Image URLs:', appraisal.images);

      res.json(appraisal);
    } catch (error) {
      console.error('❌ [getAppraisalDetails] Error:', error);
      res.status(500).json({ success: false, message: 'Error getting appraisal details.' });
    }
  }

  // ... rest of the controller methods remain the same ...
}

module.exports = AppraisalController;