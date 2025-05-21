const fetch = require('node-fetch');
const { config } = require('../../config');
const { createLogger } = require('../../utils/logger');

const logger = createLogger('ReprocessController');

class AppraisalReprocessController {
  static async reprocessWithGeminiData(req, res) {
    const { postId, sessionId, appraisalValue, description, appraisalType } = req.body;

    if (!postId || !appraisalValue || !description) {
      return res.status(400).json({ 
        success: false, 
        message: 'postId, appraisalValue, and description are required.' 
      });
    }

    try {
      // Send an immediate response that the request was received
      res.json({ 
        success: true, 
        message: 'Appraisal reprocessing started successfully. Processing will continue in the background.' 
      });

      logger.info(`Starting reprocess for WordPress post ${postId} with value ${appraisalValue}`);

      // Make the request to the task queue service asynchronously after sending response
      fetch(`${config.TASK_QUEUE_URL}/api/process-step`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          postId,
          sessionId,
          startStep: 'STEP_SET_VALUE',
          options: {
            appraisalValue,
            description,
            appraisalType: appraisalType || 'DEFAULT',
            reprocess: true
          }
        })
      }).then(taskQueueResponse => {
        if (!taskQueueResponse.ok) {
          return taskQueueResponse.json().then(errorData => {
            logger.error(`Task queue service error: ${errorData.message || taskQueueResponse.statusText}`);
          });
        }
        logger.info(`Background task for appraisal post ${postId} initiated successfully`);
      }).catch(error => {
        logger.error('Error in background task processing:', error);
      });
      
    } catch (error) {
      logger.error('Error starting appraisal reprocess:', error);
      // Only reach here if there's an error before sending the response
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Completely reprocess an appraisal based on WordPress post ID
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  static async reprocessByPostId(req, res) {
    const { postId } = req.params;
    
    logger.info(`🔄 [reprocessByPostId] Starting complete reprocessing for WordPress post ID: ${postId}`);
    
    try {
      // Ensure APPRAISALS_BACKEND_URL is available
      if (!config.APPRAISALS_BACKEND_URL) {
        throw new Error('APPRAISALS_BACKEND_URL is not configured');
      }
      
      // Use the complete-appraisal-report endpoint in appraisals-backend
      const appraisalsEndpoint = `/api/report/complete-appraisal-report`;
      const url = `${config.APPRAISALS_BACKEND_URL}${appraisalsEndpoint}`;
      
      logger.info(`🔄 [reprocessByPostId] Calling appraisals-backend at ${url} for postId: ${postId}`);
      
      // Prepare the request data for backend processing
      const requestData = {
        postId,
        justificationOnly: false // We want to process the entire appraisal
      };
      
      // Make the direct call to the appraisals-backend service
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`🔄 [reprocessByPostId] Error from appraisals-backend: ${errorText}`);
        throw new Error(`Error from appraisals-backend: ${response.status} ${response.statusText}`);
      }
      
      // Return immediate success response to client
      const responseForClient = {
        success: true,
        message: `Appraisal submitted for complete reprocessing`,
        details: {
          postId,
          service: 'appraisals-backend',
          status: 'processing',
          timestamp: new Date().toISOString()
        }
      };
      
      // Send the response to the client
      res.json(responseForClient);
      
    } catch (error) {
      logger.error(`🔄 [reprocessByPostId] Error reprocessing post ID ${postId}:`, error);
      
      res.status(500).json({
        success: false,
        message: `Failed to reprocess appraisal: ${error.message}`
      });
    }
  }
}

module.exports = AppraisalReprocessController; 