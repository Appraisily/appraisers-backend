// controllers/updatePendingAppraisalController.js

const OpenAI = require('openai');
const { config } = require('../shared/config');
const { initializeSheets } = require('../shared/googleSheets');
const emailService = require('../services/emailService');
const fetch = require('node-fetch');

class UpdatePendingAppraisalController {
  async updatePendingAppraisal(req, res) {
    try {
      console.log('Cloud Run: Received payload -', JSON.stringify(req.body));

      // Verify shared secret
      const incomingSecret = req.headers['x-shared-secret'];
      if (incomingSecret !== config.SHARED_SECRET) {
        console.warn('Cloud Run: Authentication failed - Invalid shared secret.');
        return res.status(403).json({ success: false, message: 'Forbidden: Invalid shared secret.' });
      }
      console.log('Cloud Run: Shared secret verified correctly.');

      // Get data from payload
      let { 
        session_id, 
        customer_email, 
        customer_name,
        description,
        payment_id,
        wordpress_url,
        images 
      } = req.body;

      // Log each field individually
      console.log(`Cloud Run: session_id - ${session_id}`);
      console.log(`Cloud Run: customer_email - ${customer_email}`);
      console.log(`Cloud Run: customer_name - ${customer_name}`);
      console.log(`Cloud Run: description - ${description}`);
      console.log(`Cloud Run: payment_id - ${payment_id}`);
      console.log(`Cloud Run: wordpress_url - ${wordpress_url}`);
      console.log(`Cloud Run: images - ${JSON.stringify(images)}`);

      // Extract post_id from wordpress_url
      const post_id = new URL(wordpress_url).searchParams.get('post');
      console.log(`Cloud Run: Extracted post_id - ${post_id}`);

      // Validate minimum required fields
      if (!session_id || !customer_email || !wordpress_url || typeof images !== 'object') {
        console.warn('Cloud Run: Missing required fields in payload.');
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
      }

      // Send immediate response
      res.json({ success: true, message: 'Appraisal status update initiated.' });
      console.log('Cloud Run: Response 200 sent to client.');

      // Process in background
      (async () => {
        try {
          // Validate main image URL
          const mainImageUrl = images.main || '';
          if (!mainImageUrl) {
            console.error('Cloud Run: Main image URL is required for generating description.');
            return;
          }

          // Initialize OpenAI with API key
          const openaiApiKey = config.OPENAI_API_KEY;
          if (!openaiApiKey) {
            console.error('OPENAI_API_KEY not configured in environment variables.');
            return;
          }

          const openai = new OpenAI({
            apiKey: openaiApiKey,
          });

          // Generate AI description
          console.info("Sending image and prompt to OpenAI API for description generation.");
          const iaDescription = await this.generateAIDescription(openai, mainImageUrl);
          console.log(`Cloud Run: AI Description generated: ${iaDescription}`);

          // Update WordPress title
          try {
            await this.updateWordPressTitle(post_id, iaDescription);
            console.log('Cloud Run: WordPress title updated successfully.');
          } catch (wpError) {
            console.error('Cloud Run: Error updating WordPress title:', wpError);
          }

          // Update Google Sheets
          try {
            const sheets = await initializeSheets();
            const sheetData = await this.updateGoogleSheets(sheets, session_id, iaDescription, description, images);
            customer_name = sheetData.customer_name || customer_name;
            console.log(`Cloud Run: Google Sheets updated. Customer name: ${customer_name}`);
          } catch (sheetsError) {
            console.error('Cloud Run: Error updating Google Sheets:', sheetsError);
          }

          // Send email notification
          try {
            await emailService.sendAppraisalUpdateEmail(
              customer_email,
              customer_name,
              description,
              iaDescription
            );
            console.log(`Cloud Run: Email notification sent to ${customer_email}`);
          } catch (emailError) {
            console.error('Cloud Run: Error sending email notification:', emailError);
          }

        } catch (error) {
          console.error('Cloud Run: Background processing error:', error);
        }
      })();

    } catch (error) {
      console.error('Cloud Run: Error in /api/update-pending-appraisal:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Internal Server Error.' });
      }
    }
  }

  async generateAIDescription(openai, mainImageUrl) {
    const condensedInstructions = "Describe the artwork's style, medium, color palette, and composition as accurately as possible. If any part cannot be completed, simply skip it. Provide the description in formal language, assuming you are an expert in art. The description should be less than 50 words, including only the text of the description.";

    const messagesWithRoles = [
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
    ];

    console.info("Sending image and prompt to OpenAI API for description generation.");

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: messagesWithRoles,
        max_tokens: 300,
      });

      const description = response.choices[0].message.content.trim();
      console.log(`Generated AI description: ${description}`);
      return description;
    } catch (error) {
      console.error('OpenAI API Error:', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  async updateWordPressTitle(post_id, iaDescription) {
    const wpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${post_id}`;
    const authHeader = 'Basic ' + Buffer.from(`${encodeURIComponent(config.WORDPRESS_USERNAME)}:${config.WORDPRESS_APP_PASSWORD.trim()}`).toString('base64');

    console.log(`[update-pending-appraisal] Updating WordPress title for post ${post_id}`);

    const updateResponse = await fetch(wpEndpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        title: `Preliminary Analysis: ${iaDescription}`,
      }),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error(`[update-pending-appraisal] Error updating WordPress title: ${errorText}`);
      throw new Error(`Error updating WordPress title: ${errorText}`);
    }

    console.log('WordPress title updated successfully.');
  }

  async updateGoogleSheets(sheets, session_id, iaDescription, description, images) {
    console.log(`[update-pending-appraisal] Updating Google Sheets for session ${session_id}`);

    const spreadsheetId = config.PENDING_APPRAISALS_SPREADSHEET_ID;
    const sheetName = config.GOOGLE_SHEET_NAME;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:O`,
    });

    const values = response.data.values || [];
    let rowIndex = null;
    let customer_name = '';

    for (let i = 0; i < values.length; i++) {
      const rowSessionId = values[i][2]; // session_id in column C (index 2)
      if (rowSessionId === session_id) {
        rowIndex = i + 1; // Sheets rows start at 1
        customer_name = values[i][4] || ''; // customer_name in column E (index 4)
        break;
      }
    }

    if (rowIndex === null) {
      console.error(`Cloud Run: No se encontró el session_id ${session_id} en Google Sheets.`);
      return { customer_name: '' };
    }

    console.log(`Cloud Run: Customer name obtained from Google Sheets: ${customer_name}`);

    // Convert images array to JSON string
    const imagesString = JSON.stringify(images);

    // Update IA description in column H
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!H${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[iaDescription]],
      },
    });
    console.log(`Cloud Run: AI description saved in row ${rowIndex}, column H.`);

    // Update customer description in column I
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!I${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[description || '']],
      },
    });
    console.log(`Cloud Run: Customer description saved in row ${rowIndex}, column I.`);

    // Update images array in column O
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!O${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[imagesString]],
      },
    });
    console.log(`Cloud Run: Images array saved in row ${rowIndex}, column O.`);

    return { customer_name };
  }
}

module.exports = new UpdatePendingAppraisalController();