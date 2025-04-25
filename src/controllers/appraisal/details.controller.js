const { sheetsService, wordpressService, appraisalService, isServiceAvailable, safeServiceCall } = require('../../services');
const { config } = require('../../config');
const { getImageUrl } = require('../../services/getImageUrl');
const axios = require('axios');

class AppraisalDetailsController {
  static async getDetails(req, res) {
    const { id } = req.params;
    try {
      console.log(`[getDetails] Starting to fetch details for appraisal ID: ${id}`);

      const range = `${config.GOOGLE_SHEET_NAME}!A${id}:Q${id}`;
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range
      );

      const row = values[0];
      if (!row) {
        return res.status(404).json({ success: false, message: 'Appraisal not found.' });
      }

      const appraisal = {
        id,
        date: row[0] || '',
        appraisalType: row[1] || '',
        identifier: row[2] || '',
        customerEmail: row[3] || '',
        customerName: row[4] || '',
        status: row[5] || '',
        wordpressUrl: row[6] || '',
        iaDescription: row[7] || '',
        customerDescription: row[8] || '',
        value: row[9] || '',
        appraisersDescription: row[10] || '',
        gcsBackupUrl: row[16] || ''
      };

      const postId = new URL(appraisal.wordpressUrl).searchParams.get('post');
      if (!postId) {
        throw new Error('Invalid WordPress URL');
      }

      const wpData = await wordpressService.getPost(postId);
      const acfFields = wpData.acf || {};

      appraisal.images = {
        main: await getImageUrl(acfFields.main),
        age: await getImageUrl(acfFields.age),
        signature: await getImageUrl(acfFields.signature),
      };

      res.json(appraisal);
    } catch (error) {
      console.error('[getDetails] Error:', error);
      res.status(500).json({ success: false, message: 'Error getting appraisal details.' });
    }
  }

  static async getDetailsForEdit(req, res) {
    const { id } = req.params;
    try {
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!A${id}:K${id}`
      );

      const row = values[0];
      if (!row) {
        return res.status(404).json({ success: false, message: 'Appraisal not found.' });
      }

      const appraisal = {
        id,
        date: row[0] || '',
        appraisalType: row[1] || '',
        identifier: row[2] || '',
        customerEmail: row[3] || '',
        customerName: row[4] || '',
        status: row[5] || '',
        wordpressUrl: row[6] || '',
        iaDescription: row[7] || '',
        customerDescription: row[8] || '',
        value: row[9] || '',
        appraisersDescription: row[10] || ''
      };

      const postId = new URL(appraisal.wordpressUrl).searchParams.get('post');
      if (!postId) {
        throw new Error('Invalid WordPress URL');
      }

      const wpData = await wordpressService.getPost(postId);
      appraisal.acfFields = wpData.acf || {};
      appraisal.images = {
        main: await getImageUrl(appraisal.acfFields.main),
        age: await getImageUrl(appraisal.acfFields.age),
        signature: await getImageUrl(appraisal.acfFields.signature),
      };

      res.json(appraisal);
    } catch (error) {
      console.error('Error getting appraisal details for edit:', error);
      res.status(500).json({ success: false, message: 'Error getting appraisal details.' });
    }
  }

  /**
   * Get detailed information about a completed appraisal, including all WordPress metadata
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  static async getCompletedAppraisalDetails(req, res) {
    const { id } = req.params;
    
    try {
      console.log(`[getCompletedAppraisalDetails] Fetching details for appraisal ID: ${id}`);
      
      // Get WordPress post ID from the appraisal ID
      const postId = await sheetsService.getWordPressPostIdFromAppraisalId(id);
      
      if (!postId) {
        return res.status(404).json({
          success: false,
          message: 'Appraisal not found.'
        });
      }
      
      let postDetails;
      try {
        // Ensure wordpressService is properly initialized
        if (!wordpressService || !wordpressService.getPostWithMetadata) {
          console.error('[getCompletedAppraisalDetails] WordPress service is not properly initialized or missing getPostWithMetadata method');
          throw new Error('WordPress service is not properly initialized');
        }
        
        // Get all WordPress post metadata
        postDetails = await wordpressService.getPostWithMetadata(postId);
      } catch (metadataError) {
        console.warn(`[getCompletedAppraisalDetails] Error fetching post with metadata, falling back to basic post details:`, metadataError);
        
        // Fall back to basic post details without metadata
        try {
          if (!wordpressService || !wordpressService.getPost) {
            throw new Error('WordPress service is not properly initialized');
          }
          
          postDetails = await wordpressService.getPost(postId);
          // Add empty meta to prevent errors
          postDetails.meta = {};
        } catch (postError) {
          console.error(`[getCompletedAppraisalDetails] Failed to get basic post details:`, postError);
          throw new Error(`Failed to fetch WordPress post: ${postError.message}`);
        }
      }
      
      // Transform WordPress data into a structured format
      const appraisalDetails = {
        id,
        postId,
        title: postDetails.title?.rendered || '',
        content: postDetails.content?.rendered || '',
        appraisalValue: postDetails.acf?.appraisal_value || '',
        date: postDetails.date || '',
        metadata: {
          // Extract all ACF fields
          ...postDetails.acf,
          // Extract processing metadata
          processingSteps: postDetails.meta?.processing_steps || {}
        },
        // Links to the WordPress admin, public post, etc.
        links: {
          admin: `${config.WORDPRESS_ADMIN_URL || 'https://resources.appraisily.com/wp-admin'}/post.php?post=${postId}&action=edit`,
          public: postDetails.link || '',
          pdf: postDetails.acf?.pdf_url || ''
        }
      };
      
      return res.json({
        success: true,
        appraisalDetails
      });
    } catch (error) {
      console.error('[getCompletedAppraisalDetails] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error retrieving appraisal details',
        error: error.message
      });
    }
  }

  /**
   * Reprocess a specific step of an appraisal
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  static async reprocessAppraisalStep(req, res) {
    const { id } = req.params;
    const { stepName } = req.body;
    
    console.log(`🔄 [reprocessAppraisalStep] Reprocessing step "${stepName}" for appraisal ID: ${id}`);
    
    if (!stepName) {
      console.warn('❌ [reprocessAppraisalStep] Missing step name in request');
      return res.status(400).json({
        success: false,
        message: 'Step name is required'
      });
    }
    
    try {
      // Log the request intent in sheets
      await safeServiceCall(
        sheetsService, 
        'updateProcessingStatus', 
        [id, `Reprocessing ${stepName} - Request initiated`]
      );
      
      // Get WordPress post ID to include in the forwarded request
      console.log(`🔍 [reprocessAppraisalStep] Getting WordPress post ID for appraisal ID: ${id}`);
      const postId = await sheetsService.getWordPressPostIdFromAppraisalId(id);
      
      if (!postId) {
        console.error(`❌ [reprocessAppraisalStep] Appraisal ${id} not found or has no WordPress post ID`);
        
        await safeServiceCall(
          sheetsService, 
          'updateProcessingStatus', 
          [id, `Reprocessing failed: No WordPress post ID found`]
        );
        
        return res.status(404).json({
          success: false,
          message: 'Appraisal not found or has no WordPress post ID.'
        });
      }

      // Determine whether to send to appraisals-backend or task-queue based on step
      const stepsForAppraisalsBackend = ['regenerate_statistics', 'regenerate_visualization', 'update_statistics'];
      const useAppraisalsBackend = stepsForAppraisalsBackend.includes(stepName);
      
      if (useAppraisalsBackend) {
        // Steps that should be handled by the appraisals-backend service
        console.log(`🔄 [reprocessAppraisalStep] Forwarding step "${stepName}" processing for appraisal ${id} to appraisals-backend service`);
        
        // Ensure APPRAISALS_BACKEND_URL is available
        if (!config.APPRAISALS_BACKEND_URL) {
          throw new Error('APPRAISALS_BACKEND_URL is not configured');
        }
        
        // Use the existing endpoint for statistics regeneration
        const appraisalsEndpoint = `/api/visualizations/regenerate-statistics-and-visualizations`;
        const url = `${config.APPRAISALS_BACKEND_URL}${appraisalsEndpoint}`;
        
        console.log(`🔄 [reprocessAppraisalStep] Calling appraisals-backend at ${url}`);
        
        // Prepare the request data for backend processing
        const requestData = {
          postId,
          appraisalId: id,
          options: {
            username: req.user?.name || 'Unknown User',
            timestamp: new Date().toISOString()
          }
        };
        
        // Update WordPress that we're submitting the step for processing
        await safeServiceCall(
          wordpressService, 
          'updateStepProcessingHistory', 
          [postId, stepName, {
            timestamp: new Date().toISOString(),
            user: req.user?.name || 'Unknown User',
            status: 'submitted',
            message: `Forwarded to appraisals-backend for processing`
          }]
        );
        
        // Return immediate success response
        const responseForClient = {
          success: true,
          message: `Step "${stepName}" submitted for reprocessing`,
          result: {
            step: stepName,
            service: 'appraisals-backend',
            status: 'processing',
            details: `Request forwarded to appraisals-backend at ${new Date().toISOString()}`
          }
        };
        
        // Send the response to the client immediately
        res.json(responseForClient);
        
        // Then submit the request to the appraisals-backend in the background
        try {
          const backendResponse = await axios.post(url, requestData);
          console.log(`✅ [reprocessAppraisalStep] Request successfully processed by appraisals-backend for step "${stepName}"`);
          console.log(`✅ [reprocessAppraisalStep] Backend response: ${backendResponse.status}`);
        } catch (backendError) {
          // Log error but don't fail the request since we've already sent a response
          console.error(`❌ [reprocessAppraisalStep] Error from appraisals-backend:`, backendError.message);
          
          // Update WordPress with error status
          await safeServiceCall(
            wordpressService, 
            'updateStepProcessingHistory', 
            [postId, stepName, {
              timestamp: new Date().toISOString(),
              user: req.user?.name || 'Unknown User',
              status: 'error',
              message: `Error from appraisals-backend: ${backendError.message}`
            }]
          );
        }
        
        // Function has already sent a response, so return to prevent further execution
        return;
      } else {
        // Steps that should be handled by the task-queue service
        console.log(`🔄 [reprocessAppraisalStep] Forwarding step "${stepName}" processing for appraisal ${id} to task queue`);
        
        // Map frontend step names to task queue step names if necessary
        const stepMapping = {
          'enhance_description': 'STEP_MERGE_DESCRIPTIONS',
          'update_wordpress': 'STEP_UPDATE_WORDPRESS',
          'metadata_reprocessing': 'STEP_METADATA_REPROCESSING',
          'generate_html': 'STEP_BUILD_REPORT',
          'generate_pdf': 'STEP_GENERATE_PDF',
          'regenerate_statistics': 'STEP_GENERATE_VISUALIZATION'  // This mapping is kept for backwards compatibility
        };
        
        // Determine the task queue step name
        const taskQueueStep = stepMapping[stepName] || stepName;
        
        // Forward to task queue
        const response = await axios.post(`${config.TASK_QUEUE_URL}/api/process-step`, {
          id,
          startStep: taskQueueStep,
          options: {
            postId,
            username: req.user?.name || 'Unknown User',
            timestamp: new Date().toISOString()
          }
        });
        
        console.log(`✅ [reprocessAppraisalStep] Request forwarded to task queue for step "${stepName}"`);
        
        // Record in WordPress that the step was submitted for reprocessing
        await safeServiceCall(
          wordpressService, 
          'updateStepProcessingHistory', 
          [postId, stepName, {
            timestamp: new Date().toISOString(),
            user: req.user?.name || 'Unknown User',
            status: 'submitted',
            message: `Forwarded to task queue for processing`
          }]
        );
        
        // Return response to client
        return res.json({
          success: true,
          message: `Step "${stepName}" submitted for reprocessing`,
          result: {
            serviceResponse: response.data,
            step: stepName,
            service: 'task-queue'
          }
        });
      }
    } catch (error) {
      console.error(`❌ [reprocessAppraisalStep] Error:`, error);
      
      // Try to update sheets with error
      await safeServiceCall(
        sheetsService, 
        'updateProcessingStatus', 
        [id, `Reprocessing failed: ${error.message}`]
      );
      
      // Send error response to client
      return res.status(500).json({
        success: false,
        message: `Error submitting step for reprocessing: ${error.message}`,
        details: error.response?.data || {}
      });
    }
  }
}

module.exports = AppraisalDetailsController;