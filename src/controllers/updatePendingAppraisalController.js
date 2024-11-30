const OpenAI = require('openai');
const { config } = require('../config');
const { initializeSheets } = require('../services/googleSheets');
const emailService = require('../services/emailService');
const fetch = require('node-fetch');

class UpdatePendingAppraisalController {
  static async updatePendingAppraisal(req, res) {
    try {
      console.log('🔄 [updatePendingAppraisal] Starting request processing');
      console.log('📦 Request payload:', JSON.stringify(req.body, null, 2));
      console.log('🔑 Headers:', JSON.stringify(req.headers, null, 2));

      const incomingSecret = req.headers['x-shared-secret'];
      if (incomingSecret !== config.SHARED_SECRET) {
        console.warn('❌ Authentication failed - Invalid shared secret');
        console.log('Expected:', config.SHARED_SECRET);
        console.log('Received:', incomingSecret);
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden: Invalid shared secret.' 
        });
      }
      console.log('✅ Shared secret validated successfully');

      const { 
        session_id, 
        customer_email, 
        customer_name,
        description,
        wordpress_url,
        images 
      } = req.body;

      console.log('🔍 Validating required fields:');
      console.log('- session_id:', session_id);
      console.log('- customer_email:', customer_email);
      console.log('- wordpress_url:', wordpress_url);
      console.log('- images:', JSON.stringify(images, null, 2));

      // Extract post_id from wordpress_url
      const postId = wordpress_url ? new URL(wordpress_url).searchParams.get('post') : null;
      console.log('📎 Extracted post_id:', postId);

      if (!session_id || !customer_email || !postId || typeof images !== 'object') {
        console.warn('❌ Missing required fields');
        console.log('Validation results:');
        console.log('- session_id present:', !!session_id);
        console.log('- customer_email present:', !!customer_email);
        console.log('- postId present:', !!postId);
        console.log('- images is object:', typeof images === 'object');
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required fields.' 
        });
      }
      console.log('✅ All required fields validated');

      // Send immediate response
      res.json({ 
        success: true, 
        message: 'Appraisal status update initiated.' 
      });
      console.log('✅ Immediate response sent to client');

      // Process in background
      (async () => {
        try {
          console.log('🔄 Starting background processing');
          const mainImageUrl = images.main;
          
          if (!mainImageUrl) {
            throw new Error('Main image URL is required.');
          }
          console.log('🖼️ Main image URL:', mainImageUrl);

          // Initialize OpenAI
          console.log('🔄 Initializing OpenAI');
          const openai = new OpenAI({
            apiKey: config.OPENAI_API_KEY,
          });
          console.log('✅ OpenAI initialized');

          // Generate AI description
          console.log('🔄 Generating AI description');
          const iaDescription = await this.generateAIDescription(openai, mainImageUrl);
          console.log('✅ AI description generated:', iaDescription);

          // Update WordPress title
          console.log('🔄 Updating WordPress title');
          await this.updateWordPressTitle(postId, iaDescription);
          console.log('✅ WordPress title updated');

          // Update Google Sheets
          console.log('🔄 Updating Google Sheets');
          const sheets = await initializeSheets();
          await this.updateGoogleSheets(sheets, session_id, iaDescription, description, images);
          console.log('✅ Google Sheets updated');

          // Send email notification
          console.log('🔄 Sending email notification');
          await emailService.sendAppraisalUpdateEmail(
            customer_email,
            customer_name,
            description,
            iaDescription
          );
          console.log('✅ Email notification sent');

          console.log('✅ Background processing completed successfully');
        } catch (error) {
          console.error('❌ Background processing error:', error);
          console.error('Stack trace:', error.stack);
        }
      })();

    } catch (error) {
      console.error('❌ Error in updatePendingAppraisal:', error);
      console.error('Stack trace:', error.stack);
      if (!res.headersSent) {
        res.status(500).json({ 
          success: false, 
          message: 'Internal Server Error.' 
        });
      }
    }
  }

  static async generateAIDescription(openai, mainImageUrl) {
    console.log('🔄 [generateAIDescription] Starting');
    const condensedInstructions = "Describe the artwork's style, medium, color palette, and composition as accurately as possible. If any part cannot be completed, simply skip it. Provide the description in formal language, assuming you are an expert in art. The description should be less than 50 words, including only the text of the description.";

    try {
      console.log('📤 Sending request to OpenAI');
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: condensedInstructions },
              {
                type: "image_url",
                image_url: {
                  "url": mainImageUrl,
                  "detail": "high",
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      });

      const description = response.choices[0].message.content.trim();
      console.log('✅ AI description generated:', description);
      return description;
    } catch (error) {
      console.error('❌ OpenAI API error:', error);
      throw error;
    }
  }

  static async updateWordPressTitle(postId, iaDescription) {
    console.log('🔄 [updateWordPressTitle] Starting');
    console.log('Parameters:', { postId, iaDescription });

    const wpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${postId}`;
    console.log('WordPress endpoint:', wpEndpoint);

    const authHeader = 'Basic ' + Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64');
    console.log('Auth header prepared (not shown for security)');

    try {
      const response = await fetch(wpEndpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          title: `Preliminary Analysis: ${iaDescription}`,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ WordPress API error:', errorText);
        throw new Error(`Error updating WordPress title: ${errorText}`);
      }

      console.log('✅ WordPress title updated successfully');
    } catch (error) {
      console.error('❌ Error in updateWordPressTitle:', error);
      throw error;
    }
  }

  static async updateGoogleSheets(sheets, session_id, iaDescription, description, images) {
    console.log('🔄 [updateGoogleSheets] Starting');
    console.log('Parameters:', { session_id, iaDescription: iaDescription.substring(0, 50) + '...' });

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range: `${config.GOOGLE_SHEET_NAME}!A:O`,
      });

      const values = response.data.values || [];
      console.log(`📊 Found ${values.length} rows in sheet`);

      let rowIndex = null;

      for (let i = 0; i < values.length; i++) {
        if (values[i][2] === session_id) {
          rowIndex = i + 1;
          break;
        }
      }

      if (!rowIndex) {
        console.error('❌ Session ID not found in sheet:', session_id);
        throw new Error(`Session ID ${session_id} not found`);
      }

      console.log('📍 Found matching row at index:', rowIndex);

      // Update IA description
      console.log('🔄 Updating IA description');
      await sheets.spreadsheets.values.update({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range: `${config.GOOGLE_SHEET_NAME}!H${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [[iaDescription]],
        },
      });

      // Update customer description
      console.log('🔄 Updating customer description');
      await sheets.spreadsheets.values.update({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range: `${config.GOOGLE_SHEET_NAME}!I${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [[description || '']],
        },
      });

      // Update images
      console.log('🔄 Updating images');
      await sheets.spreadsheets.values.update({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range: `${config.GOOGLE_SHEET_NAME}!O${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [[JSON.stringify(images)]],
        },
      });

      console.log('✅ All Google Sheets updates completed successfully');
    } catch (error) {
      console.error('❌ Error in updateGoogleSheets:', error);
      throw error;
    }
  }
}

module.exports = UpdatePendingAppraisalController;