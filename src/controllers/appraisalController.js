const { PubSub } = require('@google-cloud/pubsub');
const { config } = require('../config');
const appraisalWorkerService = require('../services/appraisalWorkerService');

class AppraisalController {
  static async completeProcess(req, res) {
    const { id } = req.params;
    const { appraisalValue, description } = req.body;

    console.log('🔄 [completeProcess] Starting appraisal process', {
      id,
      appraisalValue,
      hasDescription: !!description
    });

    if (!appraisalValue || !description) {
      console.log('❌ [completeProcess] Missing required fields');
      return res.status(400).json({ 
        success: false, 
        message: 'Appraisal value and description are required.' 
      });
    }

    try {
      const pubsub = new PubSub({
        projectId: config.GOOGLE_CLOUD_PROJECT_ID,
      });

      const task = {
        type: 'COMPLETE_APPRAISAL',
        data: {
          id,
          appraisalValue,
          description,
          timestamp: new Date().toISOString()
        }
      };

      const dataBuffer = Buffer.from(JSON.stringify(task));
      const messageId = await pubsub.topic('appraisal-tasks').publish(dataBuffer);

      console.log(`✅ [completeProcess] Task queued successfully`, {
        messageId,
        id,
        timestamp: new Date().toISOString()
      });

      res.json({ 
        success: true, 
        message: 'Appraisal process queued successfully.',
        data: {
          messageId,
          status: 'queued'
        }
      });

    } catch (error) {
      console.error('❌ [completeProcess] Error:', error);
      res.status(500).json({ 
        success: false, 
        message: `Error queueing appraisal: ${error.message}` 
      });
    }
  }

  static async processWorker(req, res) {
    const { id, appraisalValue, description } = req.body;

    console.log('🔄 [processWorker] Processing appraisal', { id });

    try {
      await appraisalWorkerService.initialize();

      // 1. Update value and description
      await appraisalWorkerService.updateAppraisalValue(id, appraisalValue, description);

      // 2. Merge descriptions
      const mergedDescription = await appraisalWorkerService.mergeDescriptions(id, description);

      // 3. Update WordPress title
      await appraisalWorkerService.updatePostTitle(id, mergedDescription);

      // 4. Insert template
      await appraisalWorkerService.insertTemplate(id);

      // 5. Generate PDF and documents
      await appraisalWorkerService.generateDocuments(id);

      // 6. Send email
      await appraisalWorkerService.sendCustomerEmail(id);

      // 7. Mark as completed
      await appraisalWorkerService.markAsCompleted(id);

      console.log(`✅ [processWorker] Appraisal ${id} processed successfully`);
      res.json({
        success: true,
        message: 'Appraisal processed successfully'
      });

    } catch (error) {
      console.error('❌ [processWorker] Error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = AppraisalController;