/**
 * API routes for PDF generation
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { sheetsService, wordpressService, safeServiceCall } = require('../services');
const { config } = require('../config');
const axios = require('axios');

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
  const { appraisalId, startStep } = req.body;

  if (!appraisalId) {
    return res.status(400).json({
      success: false,
      message: 'appraisalId is required'
    });
  }

  try {
    console.log(`🔄 [generate-pdf-steps] Starting PDF generation for appraisal ID ${appraisalId}`);
    
    // Log the request intent in sheets
    await safeServiceCall(
      sheetsService, 
      'updateProcessingStatus', 
      [appraisalId, `PDF Generation - Request initiated by ${req.user?.name || 'Unknown User'}`]
    );
    
    // Get WordPress post ID to include in the forwarded request
    console.log(`🔍 [generate-pdf-steps] Getting WordPress post ID for appraisal ID: ${appraisalId}`);
    const postId = await sheetsService.getWordPressPostIdFromAppraisalId(appraisalId);
    
    if (!postId) {
      console.error(`❌ [generate-pdf-steps] Appraisal ${appraisalId} not found or has no WordPress post ID`);
      
      await safeServiceCall(
        sheetsService, 
        'updateProcessingStatus', 
        [appraisalId, `PDF generation failed: No WordPress post ID found`]
      );
      
      return res.status(404).json({
        success: false,
        message: 'Appraisal not found or has no WordPress post ID.'
      });
    }
    
    // Ensure APPRAISALS_BACKEND_URL is available
    if (!config.APPRAISALS_BACKEND_URL) {
      throw new Error('APPRAISALS_BACKEND_URL is not configured');
    }
    
    // Use the pdf-generation endpoint in appraisals-backend
    const appraisalsEndpoint = `/api/pdf/generate-pdf`;
    const url = `${config.APPRAISALS_BACKEND_URL}${appraisalsEndpoint}`;
    
    console.log(`🔄 [generate-pdf-steps] Calling appraisals-backend at ${url} for postId: ${postId}`);
    
    // Prepare the request data for backend processing
    const requestData = {
      postId,
      startStep: startStep || 'STEP_PREPARE_CONTENT', // Default first step if not specified
      options: {
        username: req.user?.name || 'Unknown User',
        timestamp: new Date().toISOString()
      }
    };
    
    // Update WordPress that we're submitting for PDF generation
    await safeServiceCall(
      wordpressService, 
      'updateStepProcessingHistory', 
      [postId, 'generate_pdf', {
        timestamp: new Date().toISOString(),
        user: req.user?.name || 'Unknown User',
        status: 'submitted',
        message: `Forwarded to appraisals-backend for PDF generation`
      }]
    );
    
    // Return immediate success response
    const responseForClient = {
      success: true,
      message: `PDF generation request submitted successfully`,
      details: {
        appraisalId,
        postId,
        service: 'appraisals-backend',
        status: 'processing',
        timestamp: new Date().toISOString()
      }
    };
    
    // Send the response to the client immediately
    res.json(responseForClient);
    
    // Then submit the request to the appraisals-backend in the background
    try {
      const backendResponse = await axios.post(url, requestData);
      console.log(`✅ [generate-pdf-steps] Request successfully processed by appraisals-backend`);
      console.log(`✅ [generate-pdf-steps] Backend response status: ${backendResponse.status}`);
      
      // Update the processing status in sheets
      await safeServiceCall(
        sheetsService, 
        'updateProcessingStatus', 
        [appraisalId, `PDF generation - Successfully submitted to appraisals-backend`]
      );
      
      // Update WordPress with success status
      await safeServiceCall(
        wordpressService, 
        'updateStepProcessingHistory', 
        [postId, 'generate_pdf', {
          timestamp: new Date().toISOString(),
          user: req.user?.name || 'Unknown User',
          status: 'completed',
          message: `Successfully forwarded to appraisals-backend for PDF generation`
        }]
      );
    } catch (backendError) {
      // Log error but don't fail the request since we've already sent a response
      console.error(`❌ [generate-pdf-steps] Error from appraisals-backend:`, backendError.message);
      
      // Update the processing status in sheets with error
      await safeServiceCall(
        sheetsService, 
        'updateProcessingStatus', 
        [appraisalId, `PDF generation failed: ${backendError.message}`]
      );
      
      // Update WordPress with error status
      await safeServiceCall(
        wordpressService, 
        'updateStepProcessingHistory', 
        [postId, 'generate_pdf', {
          timestamp: new Date().toISOString(),
          user: req.user?.name || 'Unknown User',
          status: 'error',
          message: `Error from appraisals-backend: ${backendError.message}`
        }]
      );
    }
  } catch (error) {
    console.error(`❌ [generate-pdf-steps] Error:`, error);
    
    // Try to update sheets with error
    await safeServiceCall(
      sheetsService, 
      'updateProcessingStatus', 
      [appraisalId, `PDF generation failed: ${error.message}`]
    );
    
    // Only send error response if we haven't sent a response yet
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: `Error generating PDF: ${error.message}`
      });
    }
  }
});

module.exports = router;