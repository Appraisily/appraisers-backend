const processRequestService = require('../../services/processRequest.service');
const { isValidEmail } = require('../../utils/validators');

class ProcessRequestController {
  static async processRequest(req, res) {
    try {
      const { 
        session_id, 
        post_edit_url, 
        images, 
        customer_email, 
        customer_name 
      } = req.body;

      // Validate required fields
      if (!session_id || !post_edit_url || !images || !customer_email) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      // Validate email format
      if (!isValidEmail(customer_email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }

      // Process request
      const description = await processRequestService.processRequest({
        session_id,
        post_edit_url,
        images,
        customer_email,
        customer_name
      });

      res.json({
        success: true,
        message: 'Appraisal request processed successfully',
        title: description
      });

    } catch (error) {
      console.error('Error processing request:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
}

module.exports = ProcessRequestController;