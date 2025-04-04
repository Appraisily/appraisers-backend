/**
 * API routes for PDF generation
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');

/**
 * Get available PDF generation steps
 * GET /api/pdf/steps
 */
router.get('/steps', authenticate, async (req, res) => {
  try {
    // Define PDF generation steps
    const steps = [
      'STEP_PREPARE_CONTENT',
      'STEP_FORMAT_CONTENT',
      'STEP_GENERATE_DOCUMENTS',
      'STEP_INSERT_IMAGES',
      'STEP_FINALIZE_PDF'
    ];

    res.json({
      success: true,
      steps: steps,
      defaultOrder: steps
    });
  } catch (error) {
    console.error('Error retrieving PDF steps:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve PDF steps'
    });
  }
});

/**
 * Generate PDF using step-by-step approach
 * POST /api/pdf/generate-pdf-steps
 */
router.post('/generate-pdf-steps', authenticate, async (req, res) => {
  const { postId, startStep, options } = req.body;

  if (!postId) {
    return res.status(400).json({
      success: false,
      message: 'postId is required'
    });
  }

  try {
    console.log(`Starting PDF generation for post ID ${postId} from step ${startStep}`);
    
    // For now, just return a success response
    // In a real implementation, this would call PDF generation services
    
    res.json({
      success: true,
      message: `PDF generation completed successfully from step ${startStep}`,
      pdfLink: 'https://example.com/sample.pdf',
      docLink: 'https://docs.google.com/document/d/example',
      steps: [
        { time: new Date(), message: `Started PDF generation from step: ${startStep}`, level: 'info' },
        { time: new Date(), message: 'Preparation complete', level: 'info' },
        { time: new Date(), message: 'PDF generated successfully', level: 'info' }
      ]
    });
  } catch (error) {
    console.error(`Error generating PDF for post ${postId} from step ${startStep}:`, error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate PDF',
      steps: [
        { time: new Date(), message: error.message, level: 'error' }
      ]
    });
  }
});

module.exports = router;