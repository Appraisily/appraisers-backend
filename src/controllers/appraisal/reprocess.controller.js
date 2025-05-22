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
      const appraisalsEndpoint = `/complete-appraisal-report`;
      const url = `${config.APPRAISALS_BACKEND_URL}${appraisalsEndpoint}`;
      
      logger.info(`🔄 [reprocessByPostId] Will call appraisals-backend at ${url} for postId: ${postId}`);
      
      // Prepare the request data for backend processing
      const requestData = {
        postId,
        justificationOnly: false // We want to process the entire appraisal
      };
      
      // --------------------------------------------------------------
      // 1) Send immediate response to the client so they don't wait
      // --------------------------------------------------------------
      res.json({
        success: true,
        message: 'Appraisal reprocessing request submitted. Processing will continue in the background.',
        details: {
          postId,
          service: 'appraisals-backend',
          status: 'processing',
          timestamp: new Date().toISOString()
        }
      });

      // --------------------------------------------------------------
      // 2) Perform the actual request to appraisals-backend in background
      // --------------------------------------------------------------
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })
        .then(async backendRes => {
          if (!backendRes.ok) {
            const text = await backendRes.text();
            logger.error(`🔄 [reprocessByPostId] Backend error (${backendRes.status}): ${text}`);
          } else {
            logger.info(`✅ [reprocessByPostId] Backend accepted request for post ${postId}`);
          }
        })
        .catch(err => {
          logger.error(`❌ [reprocessByPostId] Error calling appraisals-backend:`, err.message);
        });
      
    } catch (error) {
      // If we reach here, response has NOT been sent yet
      logger.error(`🔄 [reprocessByPostId] Immediate failure for post ID ${postId}:`, error);
      return res.status(500).json({
        success: false,
        message: `Failed to submit appraisal for reprocessing: ${error.message}`
      });
    }
  }
}

module.exports = AppraisalReprocessController; 