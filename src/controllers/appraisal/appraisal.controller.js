// ... existing imports ...
const { v4: uuidv4 } = require('uuid');
const { openaiService, sheetsService, emailService } = require('../../services');

class AppraisalController {
  // ... existing methods ...

  static async processAppraisalRequest(req, res) {
    const executionId = uuidv4();
    console.log(`[${executionId}] Processing appraisal request`);

    try {
      const { 
        session_id, 
        post_edit_url, 
        images, 
        customer_email, 
        customer_name = 'Customer' 
      } = req.body;

      // Validate required fields
      if (!session_id || !post_edit_url || !images || !customer_email) {
        console.warn(`[${executionId}] Missing required fields`);
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      // Validate email format
      if (!this.isValidEmail(customer_email)) {
        console.warn(`[${executionId}] Invalid email format: ${customer_email}`);
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }

      // Find row in sheets
      const rowIndex = await this.findRowBySessionId(session_id);
      if (!rowIndex) {
        console.warn(`[${executionId}] Session ID not found: ${session_id}`);
        return res.status(404).json({
          success: false,
          message: 'Session ID not found'
        });
      }

      // Update status and URL
      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!F${rowIndex}:G${rowIndex}`,
        [['Identification in progress', post_edit_url]]
      );

      // Generate description using OpenAI
      const description = await openaiService.generateDescription(
        images.main,
        images.signature,
        images.age
      );

      // Update description in sheets
      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!H${rowIndex}`,
        [[description]]
      );

      // Send email notification
      await emailService.sendAppraisalUpdateEmail(
        customer_email,
        customer_name,
        '',
        description
      );

      console.log(`[${executionId}] Request processed successfully`);
      res.json({
        success: true,
        message: 'Appraisal request processed successfully',
        title: description
      });

    } catch (error) {
      console.error(`[${executionId}] Error processing request:`, error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static async findRowBySessionId(sessionId) {
    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!C:C`
    );

    for (let i = 0; i < values.length; i++) {
      if (values[i][0] === sessionId) {
        return i + 1;
      }
    }

    return null;
  }
}

module.exports = {
  // ... existing exports ...
  processAppraisalRequest: AppraisalController.processAppraisalRequest
};