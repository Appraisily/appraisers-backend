const UpdatePendingService = require('./updatePending.service');

class UpdatePendingController {
  async updatePendingAppraisal(req, res) {
    try {
      // Verify shared secret
      const incomingSecret = req.headers['x-shared-secret'];
      if (incomingSecret !== config.SHARED_SECRET) {
        return res.status(403).json({
          success: false,
          message: 'Invalid shared secret'
        });
      }

      // Validate required fields
      const { description, images, post_id, post_edit_url, customer_email, session_id } = req.body;
      if (!session_id || !customer_email || !post_id || !images?.main || !post_edit_url) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      // Send immediate response
      res.json({ success: true });

      // Process in background
      UpdatePendingService.processUpdate(req.body).catch(error => {
        console.error('Background processing error:', error);
      });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: error.message
        });
      }
    }
  }
}

module.exports = new UpdatePendingController();