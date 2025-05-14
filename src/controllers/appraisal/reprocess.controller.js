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
            appraisalType: appraisalType || 'DEFAULT'
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
}

module.exports = AppraisalReprocessController; 