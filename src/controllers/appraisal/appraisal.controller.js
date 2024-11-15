const AppraisalService = require('./appraisal.service');

class AppraisalController {
  async getAppraisals(req, res) {
    try {
      const appraisals = await AppraisalService.getPendingAppraisals();
      res.json(appraisals);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getCompleted(req, res) {
    try {
      const completed = await AppraisalService.getCompletedAppraisals();
      res.json(completed);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getDetails(req, res) {
    try {
      const details = await AppraisalService.getAppraisalDetails(req.params.id);
      res.json(details);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async setValue(req, res) {
    try {
      await AppraisalService.setAppraisalValue(
        req.params.id,
        req.body.appraisalValue,
        req.body.description,
        req.body.isEdit
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async completeProcess(req, res) {
    try {
      await AppraisalService.startCompletionProcess(
        req.params.id,
        req.body.appraisalValue,
        req.body.description
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async processWorker(req, res) {
    try {
      await AppraisalService.processWorkerTask(
        req.body.id,
        req.body.appraisalValue,
        req.body.description
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new AppraisalController();