const { sheetsService, openaiService, emailService } = require('./index');
const { config } = require('../config');
const { v4: uuidv4 } = require('uuid');

class ProcessRequestService {
  async processRequest(data) {
    const executionId = uuidv4();
    console.log(`[${executionId}] Processing appraisal request`);

    const { 
      session_id, 
      post_edit_url, 
      images, 
      customer_email, 
      customer_name = 'Customer' 
    } = data;

    // Find row in sheets
    const rowIndex = await this.findRowBySessionId(session_id);
    if (!rowIndex) {
      throw new Error('Session ID not found');
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

    return description;
  }

  async findRowBySessionId(sessionId) {
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

module.exports = new ProcessRequestService();