const OpenAI = require('openai');
const { config } = require('../config');
const { initializeSheets } = require('../services/googleSheets');
const emailService = require('../services/emailService');

class UpdatePendingAppraisalController {
  async updatePendingAppraisal(req, res) {
    try {
      console.log('Cloud Run: Received payload -', JSON.stringify(req.body));

      const incomingSecret = req.headers['x-shared-secret'];
      if (incomingSecret !== config.SHARED_SECRET) {
        console.warn('Cloud Run: Authentication failed - Invalid shared secret.');
        return res.status(403).json({ success: false, message: 'Forbidden: Invalid shared secret.' });
      }

      const { description, images, post_id, post_edit_url, customer_email, session_id } = req.body;
      let customer_name = '';

      if (!session_id || !customer_email || !post_id || typeof images !== 'object' || !post_edit_url) {
        console.warn('Cloud Run: Incomplete data received.');
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
      }

      // Send immediate response
      res.json({ success: true, message: 'Appraisal status update initiated.' });

      // Process in background
      (async () => {
        try {
          const mainImageUrl = images.main || '';
          if (!mainImageUrl) {
            throw new Error('Main image URL is required for generating description.');
          }

          // Generate AI description
          const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
          const iaDescription = await this.generateAIDescription(openai, mainImageUrl);

          // Update WordPress title
          await this.updateWordPressTitle(post_id, iaDescription);

          // Update Google Sheets and get customer name
          const sheets = await initializeSheets();
          customer_name = await this.updateGoogleSheets(sheets, session_id, iaDescription, description, images);

          // Send email notification
          await emailService.sendAppraisalUpdateEmail(
            customer_email,
            customer_name,
            description,
            iaDescription
          );

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

  // Helper methods...
  async generateAIDescription(openai, mainImageUrl) {
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

  // ... other helper methods ...
}

module.exports = new UpdatePendingAppraisalController();