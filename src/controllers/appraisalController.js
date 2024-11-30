const { PubSub } = require('@google-cloud/pubsub');
const { config } = require('../config');
const { initializeSheets } = require('../services/googleSheets');
const appraisalWorkerService = require('../services/appraisalWorkerService');
const fetch = require('node-fetch');

class AppraisalController {
  // ... existing methods ...

  static async processWorker(req, res) {
    const { id, appraisalValue, description } = req.body;

    if (!id || !appraisalValue || !description) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: id, appraisalValue, description' 
      });
    }

    try {
      await appraisalWorkerService.initialize();

      // Update appraisal value and description
      await appraisalWorkerService.updateAppraisalValue(id, appraisalValue, description);

      // Merge descriptions
      const mergedDescription = await appraisalWorkerService.mergeDescriptions(id, description);

      // Update post title with merged description
      await appraisalWorkerService.updatePostTitle(id, mergedDescription);

      // Insert template
      await appraisalWorkerService.insertTemplate(id);

      // Generate documents (PDF and Doc)
      await appraisalWorkerService.generateDocuments(id);

      // Send email to customer
      await appraisalWorkerService.sendEmailToCustomer(id);

      // Mark appraisal as completed
      await appraisalWorkerService.markAsCompleted(id);

      res.json({ 
        success: true, 
        message: 'Appraisal processed successfully' 
      });
    } catch (error) {
      console.error('Error processing appraisal:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Error processing appraisal' 
      });
    }
  }
}

module.exports = AppraisalController;