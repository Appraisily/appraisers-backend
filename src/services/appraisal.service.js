const { 
  sheetsService, 
  wordpressService,
  pubsubService,
  emailService,
  openaiService 
} = require('../../services');
const { config } = require('../../config');
const { getImageUrl } = require('../../utils/getImageUrl');

class AppraisalService {
  async processAppraisal(id, appraisalValue, description) {
    try {
      // Step 1: Set Value
      await this.setValue(id, appraisalValue, description);
      console.log('✓ Value set successfully');

      // Step 2: Merge Descriptions
      const mergedDescription = await this.mergeDescriptions(id, description);
      console.log('✓ Descriptions merged successfully');

      // Step 3: Update Title
      const postId = await this.updateTitle(id, mergedDescription);
      console.log('✓ Title updated successfully');

      // Step 4: Insert Template
      await this.insertTemplate(id);
      console.log('✓ Template inserted successfully');

      // Step 5: Build PDF
      await this.buildPdf(id);
      console.log('✓ PDF built successfully');

      // Step 6: Send Email
      await this.sendEmail(id);
      console.log('✓ Email sent successfully');

      // Step 7: Mark as Complete
      await this.complete(id, appraisalValue, description);
      console.log('✓ Appraisal marked as complete');

    } catch (error) {
      console.error('Error processing appraisal:', error);
      throw error;
    }
  }

  async mergeDescriptions(id, appraiserDescription) {
    try {
      // Get IA description from sheets
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!H${id}`
      );

      const iaDescription = values[0][0];
      if (!iaDescription) {
        throw new Error('IA description not found');
      }

      // Use our OpenAI service to merge descriptions
      const mergedDescription = await openaiService.mergeDescriptions(
        appraiserDescription,
        iaDescription
      );

      // Save merged description to sheets
      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!L${id}`,
        [[mergedDescription]]
      );

      return mergedDescription;
    } catch (error) {
      console.error('Error merging descriptions:', error);
      throw error;
    }
  }

  // ... rest of the service methods remain the same
}

module.exports = new AppraisalService();