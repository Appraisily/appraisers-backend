/**
 * API routes for step-specific processing of appraisals
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const axios = require('axios');
const { config } = require('../config');
const { STEPS } = require('../services/appraisal.steps');

/**
 * Get available appraisal processing steps
 * GET /api/appraisals/steps
 */
router.get('/steps', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      steps: Object.values(STEPS),
      defaultOrder: [
        STEPS.SET_VALUE,
        STEPS.MERGE_DESCRIPTIONS,
        STEPS.GET_TYPE,
        STEPS.UPDATE_WORDPRESS,
        STEPS.FETCH_VALUER_DATA,
        STEPS.GENERATE_VISUALIZATION,
        STEPS.BUILD_REPORT,
        STEPS.GENERATE_PDF,
        STEPS.SEND_EMAIL,
        STEPS.COMPLETE
      ]
    });
  } catch (error) {
    console.error('Error retrieving steps:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve steps'
    });
  }
});

/**
 * Process an appraisal from a specific step
 * POST /api/appraisals/:id/process-from-step
 * 
 * MODIFIED: This endpoint now forwards processing to the task queue service
 * instead of executing steps directly.
 */
router.post('/:id/process-from-step', authenticate, async (req, res) => {
  const { id } = req.params;
  const { startStep, sessionId, options = {} } = req.body;

  // Session ID safeguard
  if (sessionId) {
    try {
      const { sheetsService } = require('../services');

      const pendingSheetName = config.GOOGLE_SHEET_NAME || 'Pending Appraisals';
      const completedSheetName = config.COMPLETED_SHEET_NAME || 'Completed Appraisals';
      const sheetId = config.PENDING_APPRAISALS_SPREADSHEET_ID;

      const readSessionId = async (sheetName) => {
        const values = await sheetsService.getValues(sheetId, `'${sheetName}'!C${id}`);
        return (values && values[0] && values[0][0]) ? values[0][0] : '';
      };

      let sheetSessionId = await readSessionId(pendingSheetName);
      if (sheetSessionId !== sessionId) {
        sheetSessionId = await readSessionId(completedSheetName);
      }

      if (sheetSessionId !== sessionId) {
        return res.status(400).json({ success:false, message:'Session ID mismatch – process aborted.' });
      }
    } catch(err) {
      console.error('Session ID validation error:', err);
      return res.status(500).json({ success:false, message:'Error validating session ID'});
    }
  }

  if (!startStep) {
    return res.status(400).json({
      success: false,
      message: 'startStep is required'
    });
  }

  if (!Object.values(STEPS).includes(startStep)) {
    return res.status(400).json({
      success: false,
      message: `Invalid step name: ${startStep}. Valid steps are: ${Object.values(STEPS).join(', ')}`
    });
  }

  try {
    console.log(`[Backend] Forwarding appraisal ${id} processing from step ${startStep} to task queue`);
    
    // Forward the request to the task queue service
    const taskQueueUrl = `${config.TASK_QUEUE_URL}/api/process-step`;
    console.log(`[Backend] Sending request to: ${taskQueueUrl}`);
    
    const response = await axios.post(taskQueueUrl, {
      id,
      startStep,
      options
    });
    
    console.log(`[Backend] Task queue responded: ${response.status} ${JSON.stringify(response.data)}`);
    
    // Return a proper response to the client
    res.json({
      success: true,
      message: `Appraisal ${id} has been queued for processing from step ${startStep}`,
      taskQueueResponse: response.data
    });
  } catch (error) {
    console.error(`[Backend] Error forwarding request to task queue:`, error);
    
    let errorResponse = {
      success: false,
      message: 'Failed to process appraisal'
    };
    
    if (error.response) {
      // The task queue service returned an error response
      errorResponse.message = error.response.data.message || 'Task queue error';
      errorResponse.details = error.response.data;
      res.status(error.response.status).json(errorResponse);
    } else if (error.request) {
      // No response received from task queue
      errorResponse.message = 'Task queue service is unavailable';
      errorResponse.details = 'No response received from service';
      res.status(503).json(errorResponse);
    } else {
      // Something went wrong in making the request
      errorResponse.message = `Error: ${error.message}`;
      res.status(500).json(errorResponse);
    }
  }
});

module.exports = router;