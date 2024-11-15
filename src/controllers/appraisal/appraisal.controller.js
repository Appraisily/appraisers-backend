const appraisalService = require('./appraisal.service');

class AppraisalController {
  // Get all appraisals
  async getAppraisals(req, res) {
    try {
      const appraisals = await appraisalService.getAppraisals();
      res.json(appraisals);
    } catch (error) {
      console.error('Error getting appraisals:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error getting appraisals.' 
      });
    }
  }

  // Get completed appraisals
  async getCompleted(req, res) {
    try {
      const completedAppraisals = await appraisalService.getCompletedAppraisals();
      res.json(completedAppraisals);
    } catch (error) {
      console.error('Error getting completed appraisals:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error getting completed appraisals.' 
      });
    }
  }

  // Get specific appraisal details
  async getDetails(req, res) {
    try {
      const appraisal = await appraisalService.getDetails(req.params.id);
      res.json(appraisal);
    } catch (error) {
      console.error('Error getting appraisal details:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error getting appraisal details.' 
      });
    }
  }

  // Get appraisal details for editing
  async getDetailsForEdit(req, res) {
    try {
      const appraisal = await appraisalService.getDetailsForEdit(req.params.id);
      res.json(appraisal);
    } catch (error) {
      console.error('Error getting appraisal details for edit:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error getting appraisal details.' 
      });
    }
  }

  // Set appraisal value
  async setValue(req, res) {
    try {
      await appraisalService.setValue(req.params.id, req.body);
      res.json({ 
        success: true, 
        message: 'Appraisal value set successfully.' 
      });
    } catch (error) {
      console.error('Error setting appraisal value:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  // Merge descriptions
  async mergeDescriptions(req, res) {
    try {
      const mergedDescription = await appraisalService.mergeDescriptions(
        req.params.id,
        req.body.description
      );
      res.json({ 
        success: true, 
        description: mergedDescription 
      });
    } catch (error) {
      console.error('Error merging descriptions:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  // Update title
  async updateTitle(req, res) {
    try {
      await appraisalService.updateTitle(req.params.id);
      res.json({ 
        success: true, 
        message: 'Title updated successfully.' 
      });
    } catch (error) {
      console.error('Error updating title:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  // Insert template
  async insertTemplate(req, res) {
    try {
      await appraisalService.insertTemplate(req.params.id);
      res.json({ 
        success: true, 
        message: 'Template inserted successfully.' 
      });
    } catch (error) {
      console.error('Error inserting template:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  // Build PDF
  async buildPdf(req, res) {
    try {
      await appraisalService.buildPdf(req.params.id);
      res.json({ 
        success: true, 
        message: 'PDF built successfully.' 
      });
    } catch (error) {
      console.error('Error building PDF:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  // Send email
  async sendEmail(req, res) {
    try {
      await appraisalService.sendEmail(req.params.id);
      res.json({ 
        success: true, 
        message: 'Email sent successfully.' 
      });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  // Complete appraisal
  async complete(req, res) {
    try {
      const { appraisalValue, description } = req.body;
      await appraisalService.complete(req.params.id, appraisalValue, description);
      res.json({ 
        success: true, 
        message: 'Appraisal completed successfully.' 
      });
    } catch (error) {
      console.error('Error completing appraisal:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  // Process worker task
  async processWorker(req, res) {
    try {
      const { id, appraisalValue, description } = req.body;
      await appraisalService.processWorker(id, appraisalValue, description);
      res.json({
        success: true,
        message: 'Worker process completed successfully'
      });
    } catch (error) {
      console.error('Worker process error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Complete process
  async completeProcess(req, res) {
    try {
      const { id } = req.params;
      const { appraisalValue, description } = req.body;
      await appraisalService.completeProcess(id, appraisalValue, description);
      res.json({ 
        success: true, 
        message: 'Appraisal process started successfully.' 
      });
    } catch (error) {
      console.error('Error starting appraisal process:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }
}

// Create singleton instance
const controller = new AppraisalController();

// Export instance methods bound to the instance
module.exports = {
  getAppraisals: controller.getAppraisals.bind(controller),
  getCompleted: controller.getCompleted.bind(controller),
  getDetails: controller.getDetails.bind(controller),
  getDetailsForEdit: controller.getDetailsForEdit.bind(controller),
  setValue: controller.setValue.bind(controller),
  mergeDescriptions: controller.mergeDescriptions.bind(controller),
  updateTitle: controller.updateTitle.bind(controller),
  insertTemplate: controller.insertTemplate.bind(controller),
  buildPdf: controller.buildPdf.bind(controller),
  sendEmail: controller.sendEmail.bind(controller),
  complete: controller.complete.bind(controller),
  processWorker: controller.processWorker.bind(controller),
  completeProcess: controller.completeProcess.bind(controller)
};