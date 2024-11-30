const OpenAI = require('openai');
const { config } = require('../config');
const { initializeSheets } = require('../services/googleSheets');
const emailService = require('../services/emailService');
const fetch = require('node-fetch');

class UpdatePendingAppraisalController {
  static async updatePendingAppraisal(req, res) {
    try {
      console.log('Received payload:', JSON.stringify(req.body));

      const incomingSecret = req.headers['x-shared-secret'];
      if (incomingSecret !== config.SHARED_SECRET) {
        console.warn('Cloud Run: Authentication failed - Invalid shared secret.');
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden: Invalid shared secret.' 
        });
      }

      const { 
        session_id, 
        customer_email, 
        customer_name,
        description,
        wordpress_url,
        images 
      } = req.body;

      // Extract post_id from wordpress_url
      const postId = new URL(wordpress_url).searchParams.get('post');

      if (!session_id || !customer_email || !postId || typeof images !== 'object') {
        console.warn('Cloud Run: Incomplete data received in the endpoint.');
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

          // Initialize OpenAI with API key
          const openai = new OpenAI({
            apiKey: config.OPENAI_API_KEY,
          });

          // Generate AI description
          const iaDescription = await this.generateAIDescription(openai, mainImageUrl);

          // Update WordPress title
          await this.updateWordPressTitle(postId, iaDescription);

          // Update Google Sheets and get customer name
          const sheets = await initializeSheets();
          await this.updateGoogleSheets(sheets, session_id, iaDescription, description, images);

          // Send email notification
          await emailService.sendAppraisalUpdateEmail(
            customer_email,
            customer_name,
            description,
            iaDescription
          );

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

  static async generateAIDescription(openai, mainImageUrl) {
    const condensedInstructions = "Describe the artwork's style, medium, color palette, and composition as accurately as possible. If any part cannot be completed, simply skip it. Provide the description in formal language, assuming you are an expert in art. The description should be less than 50 words, including only the text of the description.";

    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
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

    return response.choices[0].message.content.trim();
  }

  static async updateWordPressTitle(postId, iaDescription) {
    const wpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${postId}`;
    const authHeader = 'Basic ' + Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64');

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
      throw new Error(`Error updating WordPress title: ${errorText}`);
    }
  }

  static async updateGoogleSheets(sheets, session_id, iaDescription, description, images) {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: `${config.GOOGLE_SHEET_NAME}!A:O`,
    });

    const values = response.data.values || [];
    let rowIndex = null;

    for (let i = 0; i < values.length; i++) {
      if (values[i][2] === session_id) {
        rowIndex = i + 1;
        break;
      }
    }

    if (!rowIndex) {
      throw new Error(`Session ID ${session_id} not found`);
    }

    // Update IA description
    await sheets.spreadsheets.values.update({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: `${config.GOOGLE_SHEET_NAME}!H${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[iaDescription]],
      },
    });

    // Update customer description
    await sheets.spreadsheets.values.update({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: `${config.GOOGLE_SHEET_NAME}!I${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[description || '']],
      },
    });

    // Update images
    await sheets.spreadsheets.values.update({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: `${config.GOOGLE_SHEET_NAME}!O${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[JSON.stringify(images)]],
      },
    });
  }
}

module.exports = UpdatePendingAppraisalController;