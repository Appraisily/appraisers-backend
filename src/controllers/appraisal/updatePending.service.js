const { 
  openaiService, 
  sheetsService, 
  emailService, 
  wordpressService 
} = require('../../services');

class UpdatePendingService {
  async processUpdate({ description, images, post_id, customer_email, session_id }) {
    // Generate AI description
    const iaDescription = await openaiService.generateDescription(images.main);

    // Update WordPress title
    await wordpressService.updatePost(post_id, {
      title: `Preliminary Analysis: ${iaDescription}`
    });

    // Update sheets and get customer name
    const { customer_name } = await this.updateSheets(
      session_id,
      iaDescription,
      description,
      images
    );

    // Send email if we have customer info
    if (customer_name) {
      await emailService.sendAppraisalUpdateEmail(
        customer_email,
        customer_name,
        description,
        iaDescription
      );
    }
  }

  async updateSheets(session_id, iaDescription, description, images) {
    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!A:O`
    );

    // Find matching row
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

    // Update sheets
    await Promise.all([
      // Update IA description
      sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!H${rowIndex}`,
        [[iaDescription]]
      ),
      // Update customer description
      sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!I${rowIndex}`,
        [[description || '']]
      ),
      // Update images
      sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!O${rowIndex}`,
        [[JSON.stringify(images)]]
      )
    ]);

    return { customer_name };
  }
}

module.exports = new UpdatePendingService();