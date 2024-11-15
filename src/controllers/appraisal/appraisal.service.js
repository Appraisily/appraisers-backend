// Previous imports remain the same...

class AppraisalService {
  // Previous methods remain the same...

  async completeProcess(id, appraisalValue, description) {
    try {
      console.log('🔄 Starting appraisal completion process...');

      // Validate input
      if (!id || !appraisalValue || !description) {
        throw new Error('Missing required fields for completion');
      }

      // Prepare message data
      const messageData = {
        id,
        appraisalValue,
        description,
        timestamp: new Date().toISOString()
      };

      // Publish to PubSub
      const messageId = await pubsubService.publishMessage('appraisal-tasks', messageData);
      console.log(`✓ Published completion task with ID: ${messageId}`);

      // Update status in sheets
      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!F${id}`,
        [['Processing']]
      );

      return messageId;
    } catch (error) {
      console.error('❌ Error in completeProcess:', error);
      throw new Error(`Failed to start completion process: ${error.message}`);
    }
  }

  // Rest of the class remains the same...
}

module.exports = new AppraisalService();