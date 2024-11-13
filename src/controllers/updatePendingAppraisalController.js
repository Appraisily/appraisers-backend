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
        return res.status(403).json({ success: false, message: 'Forbidden: Invalid shared secret.' });
      }

      const { description, images, post_id, post_edit_url, customer_email, session_id } = req.body;
      let customer_name = '';

      if (!session_id || !customer_email || !post_id || typeof images !== 'object' || !post_edit_url) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
      }

      // Send immediate response
      res.json({ success: true, message: 'Appraisal status update initiated.' });

      // Process in background
      (async () => {
        try {
          const mainImageUrl = images.main;
          if (!mainImageUrl) {
            throw new Error('Main image URL is required.');
          }

          // Generate AI description
          const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
          const iaDescription = await this.generateAIDescription(openai, mainImageUrl);

          // Update WordPress title
          await this.updateWordPressTitle(post_id, iaDescription);

          // Update Google Sheets
          const sheets = await initializeSheets();
          const sheetData = await this.updateGoogleSheets(sheets, session_id, iaDescription, description, images);
          customer_name = sheetData.customer_name;

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
        res.status(500).json({ success: false, message: 'Internal Server Error.' });
      }
    }
  }

  static async generateAIDescription(openai, mainImageUrl) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Describe the artwork's style, medium, color palette, and composition as accurately as possible. Keep it under 50 words."
            },
            {
              type: "image_url",
              image_url: {
                url: mainImageUrl,
                detail: "high",
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
      throw new Error('Error updating WordPress title');
    }
  }

  static async updateGoogleSheets(sheets, session_id, iaDescription, description, images) {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: `${config.GOOGLE_SHEET_NAME}!A:O`,
    });

    const values = response.data.values || [];
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

    return { customer_name };
  }
}

module.exports = UpdatePendingAppraisalController;