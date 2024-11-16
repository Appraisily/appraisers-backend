const appraisalService = require('./appraisal.service');

class AppraisalController {
  static async getAppraisals(req, res) {
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

  static async getCompleted(req, res) {
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

  static async getDetails(req, res) {
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

  static async setValue(req, res) {
    try {
      const { id } = req.params;
      const { appraisalValue, description, isEdit } = req.body;
      await appraisalService.setValue(id, appraisalValue, description, isEdit);
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

  static async mergeDescriptions(req, res) {
    try {
      const { id } = req.params;
      const { description } = req.body;
      const mergedDescription = await appraisalService.mergeDescriptions(id, description);
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

  static async updateTitle(req, res) {
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

  static async insertTemplate(req, res) {
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

  static async buildPdf(req, res) {
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

  static async sendEmail(req, res) {
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

  static async complete(req, res) {
    try {
      const { id } = req.params;
      const { appraisalValue, description } = req.body;
      await appraisalService.complete(id, appraisalValue, description);
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

  static async processWorker(req, res) {
    try {
      const { id, appraisalValue, description } = req.body;
      await appraisalService.processAppraisal(id, appraisalValue, description);
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

  static async completeProcess(req, res) {
    try {
      const { id } = req.params;
      const { appraisalValue, description } = req.body;
      await pubsubService.publishMessage('appraisal-tasks', {
        id,
        appraisalValue,
        description
      });
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

module.exports = {
  getAppraisals: AppraisalController.getAppraisals,
  getCompleted: AppraisalController.getCompleted,
  getDetails: AppraisalController.getDetails,
  setValue: AppraisalController.setValue,
  mergeDescriptions: AppraisalController.mergeDescriptions,
  updateTitle: AppraisalController.updateTitle,
  insertTemplate: AppraisalController.insertTemplate,
  buildPdf: AppraisalController.buildPdf,
  sendEmail: AppraisalController.sendEmail,
  complete: AppraisalController.complete,
  processWorker: AppraisalController.processWorker,
  completeProcess: AppraisalController.completeProcess
};