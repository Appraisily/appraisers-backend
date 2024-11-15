const AppraisalService = require('./appraisal.service');

class AppraisalController {
  // Existing methods remain the same...

  async mergeDescriptions(req, res) {
    try {
      const { id } = req.params;
      const { description } = req.body;
      
      await AppraisalService.mergeDescriptions(id, description);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateTitle(req, res) {
    try {
      const { id } = req.params;
      await AppraisalService.updateTitle(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async insertTemplate(req, res) {
    try {
      const { id } = req.params;
      await AppraisalService.insertTemplate(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async buildPdf(req, res) {
    try {
      const { id } = req.params;
      await AppraisalService.buildPdf(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async sendEmail(req, res) {
    try {
      const { id } = req.params;
      await AppraisalService.sendEmail(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async complete(req, res) {
    try {
      const { id } = req.params;
      const { appraisalValue, description } = req.body;
      
      await AppraisalService.complete(id, appraisalValue, description);
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