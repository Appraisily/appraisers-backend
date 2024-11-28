const appraisalService = require('../../services/appraisal.service');

class AppraisalController {
  static async getAppraisals(req, res) {
    try {
      const appraisals = await appraisalService.getAppraisals();
      res.json(appraisals);
    } catch (error) {
      console.error('Error getting appraisals:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Error getting appraisals' 
      });
    }
  }

  static async getCompletedAppraisals(req, res) {
    try {
      const completedAppraisals = await appraisalService.getCompletedAppraisals();
      res.json(completedAppraisals);
    } catch (error) {
      console.error('Error getting completed appraisals:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Error getting completed appraisals' 
      });
    }
  }

  static async getDetails(req, res) {
    const { id } = req.params;
    try {
      const details = await appraisalService.getDetails(id);
      res.json(details);
    } catch (error) {
      console.error('Error getting appraisal details:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Error getting appraisal details' 
      });
    }
  }

  static async getDetailsForEdit(req, res) {
    const { id } = req.params;
    try {
      const details = await appraisalService.getDetailsForEdit(id);
      res.json(details);
    } catch (error) {
      console.error('Error getting appraisal details for edit:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Error getting appraisal details' 
      });
    }
  }

  static async setValue(req, res) {
    const { id } = req.params;
    const { appraisalValue, description, isEdit } = req.body;
    try {
      await appraisalService.setValue(id, appraisalValue, description, isEdit);
      res.json({ 
        success: true, 
        message: 'Appraisal value set successfully' 
      });
    } catch (error) {
      console.error('Error setting appraisal value:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Error setting appraisal value' 
      });
    }
  }

  static async completeProcess(req, res) {
    const { id } = req.params;
    const { appraisalValue, description } = req.body;

    try {
      await appraisalService.processAppraisal(id, appraisalValue, description);
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

module.exports = {
  getAppraisals: AppraisalController.getAppraisals,
  getCompletedAppraisals: AppraisalController.getCompletedAppraisals,
  getDetails: AppraisalController.getDetails,
  getDetailsForEdit: AppraisalController.getDetailsForEdit,
  setValue: AppraisalController.setValue,
  completeProcess: AppraisalController.completeProcess
};