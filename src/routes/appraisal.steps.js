/**
 * API routes for step-specific processing of appraisals
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { STEPS, processFromStep } = require('../services/appraisal.steps');

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
 */
router.post('/:id/process-from-step', authenticate, async (req, res) => {
  const { id } = req.params;
  const { startStep, options } = req.body;

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
    console.log(`Starting appraisal processing for ID ${id} from step ${startStep}`);
    
    const result = await processFromStep(id, startStep, options || {});
    
    res.json({
      success: true,
      message: `Appraisal processing completed successfully from step ${startStep}`,
      steps: result.logs || [],
      ...result
    });
  } catch (error) {
    console.error(`Error processing appraisal ${id} from step ${startStep}:`, error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process appraisal',
      steps: error.logs || []
    });
  }
});

module.exports = router;