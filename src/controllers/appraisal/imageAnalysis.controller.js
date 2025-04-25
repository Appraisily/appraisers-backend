const fetch = require('node-fetch');
const { createLogger } = require('../../services/loggerService');

const logger = createLogger('ImageAnalysisController');
const TASK_QUEUE_URL = process.env.TASK_QUEUE_URL || 'https://appraisers-task-queue-856401495068.us-central1.run.app';

class ImageAnalysisController {
  /**
   * Handle AI image analysis and description merging
   * This controller acts as a gateway to the task queue service
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async analyzeImageAndMergeDescriptions(req, res) {
    const { id, postId, description } = req.body;
    
    if (!id || !postId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: id and postId are required'
      });
    }
    
    logger.info(`Forwarding image analysis request for appraisal ${id}, post ${postId} to task queue service`);
    
    try {
      // Forward the request to the task queue service
      const response = await fetch(`${TASK_QUEUE_URL}/api/analyze-image-and-merge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id,
          postId,
          description: description || '',
          options: req.body.options || {}
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        logger.error(`Task queue service responded with error: ${response.status}`, errorData);
        return res.status(response.status).json({
          success: false,
          message: errorData.message || 'Error from task queue service'
        });
      }
      
      // Return success response immediately
      res.status(200).json({
        success: true,
        message: `Request to analyze image for appraisal ${id} has been submitted`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Error forwarding image analysis request for appraisal ${id}:`, error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
}

module.exports = ImageAnalysisController; 