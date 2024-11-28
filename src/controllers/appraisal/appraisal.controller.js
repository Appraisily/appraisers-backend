const appraisalService = require('../../services/appraisal.service');

class AppraisalController {
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
  completeProcess: AppraisalController.completeProcess
};