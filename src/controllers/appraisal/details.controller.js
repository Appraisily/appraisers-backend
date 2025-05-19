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

      // Check if wordpressUrl is empty or invalid
      if (!appraisal.wordpressUrl || appraisal.wordpressUrl.trim() === '') {
        console.log(`Appraisal ${id} has no WordPress URL. Returning basic appraisal data.`);
        // Return appraisal data without WordPress post data
        return res.json({
          ...appraisal,
          acfFields: {},
          images: {
            main: null,
            age: null,
            signature: null
          }
        });
      }

      // Only try to parse the URL if it exists
      let postId;
      try {
        postId = new URL(appraisal.wordpressUrl).searchParams.get('post');
        if (!postId) {
          throw new Error('Invalid WordPress URL format - missing post parameter');
        }
      } catch (urlError) {
        console.error(`Invalid WordPress URL for appraisal ${id}: ${appraisal.wordpressUrl}`, urlError);
        // Return appraisal data without WordPress post data
        return res.json({
          ...appraisal,
          acfFields: {},
          images: {
            main: null,
            age: null,
            signature: null
          }
        });
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
    const { stepName, sessionId } = req.body;
    
    console.log(`🔄 [reprocessAppraisalStep] Reprocessing step "${stepName}" for appraisal ID: ${id}`);
    
    if (!stepName) {
      console.warn('❌ [reprocessAppraisalStep] Missing step name in request');
      return res.status(400).json({
        success: false,
        message: 'Step name is required'
      });
    }
    
    try {
      // Validate session ID similar to sendConfirmationEmail
      if (sessionId) {
        const pendingSheetName   = config.GOOGLE_SHEET_NAME    || 'Pending Appraisals';
        const completedSheetName = config.COMPLETED_SHEET_NAME || 'Completed Appraisals';
        const sheetId = config.PENDING_APPRAISALS_SPREADSHEET_ID;

        const readSessionId = async (sheetName) => {
          const values = await sheetsService.getValues(sheetId, `'${sheetName}'!C${id}`);
          return (values && values[0] && values[0][0]) ? values[0][0] : '';
        };

        let sheetSessionId = await readSessionId(pendingSheetName);
        let usingCompleted = false;
        if (sheetSessionId !== sessionId) {
          sheetSessionId = await readSessionId(completedSheetName);
          usingCompleted = true;
        }

        if (sheetSessionId !== sessionId) {
          console.warn(`[reprocessAppraisalStep] Session ID mismatch (expected ${sessionId}, got ${sheetSessionId}). Aborting.`);
          return res.status(400).json({ success: false, message: 'Session ID mismatch – reprocess aborted.' });
        }
        // Save sheet selection for status updates etc.
        req._usingCompletedSheet = usingCompleted;
      }

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

  /**
   * Completely reprocess an appraisal
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  static async reprocessCompleteAppraisal(req, res) {
    const { id } = req.params;
    
    console.log(`🔄 [reprocessCompleteAppraisal] Starting complete reprocessing for appraisal ID: ${id}`);
    
    try {
      // Log the request intent in sheets
      await safeServiceCall(
        sheetsService, 
        'updateProcessingStatus', 
        [id, `Complete reprocessing - Request initiated by ${req.user?.name || 'Unknown User'}`]
      );
      
      // Get WordPress post ID to include in the forwarded request
      console.log(`🔍 [reprocessCompleteAppraisal] Getting WordPress post ID for appraisal ID: ${id}`);
      const postId = await sheetsService.getWordPressPostIdFromAppraisalId(id);
      
      if (!postId) {
        console.error(`❌ [reprocessCompleteAppraisal] Appraisal ${id} not found or has no WordPress post ID`);
        
        await safeServiceCall(
          sheetsService, 
          'updateProcessingStatus', 
          [id, `Complete reprocessing failed: No WordPress post ID found`]
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
      
      // Use the complete-appraisal-report endpoint in appraisals-backend
      const appraisalsEndpoint = `/api/report/complete-appraisal-report`;
      const url = `${config.APPRAISALS_BACKEND_URL}${appraisalsEndpoint}`;
      
      console.log(`🔄 [reprocessCompleteAppraisal] Calling appraisals-backend at ${url} for postId: ${postId}`);
      
      // Prepare the request data for backend processing
      const requestData = {
        postId,
        justificationOnly: false // We want to process the entire appraisal
      };
      
      // Update WordPress that we're submitting for complete reprocessing
      await safeServiceCall(
        wordpressService, 
        'updateStepProcessingHistory', 
        [postId, 'complete_reprocess', {
          timestamp: new Date().toISOString(),
          user: req.user?.name || 'Unknown User',
          status: 'submitted',
          message: `Forwarded to appraisals-backend for complete reprocessing`
        }]
      );
      
      // Return immediate success response to client
      const responseForClient = {
        success: true,
        message: `Appraisal submitted for complete reprocessing`,
        details: {
          id,
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
        console.log(`✅ [reprocessCompleteAppraisal] Request successfully processed by appraisals-backend`);
        console.log(`✅ [reprocessCompleteAppraisal] Backend response status: ${backendResponse.status}`);
        
        // Update the processing status in sheets
        await safeServiceCall(
          sheetsService, 
          'updateProcessingStatus', 
          [id, `Complete reprocessing - Successfully submitted to appraisals-backend`]
        );
        
        // Record success in WordPress
        await safeServiceCall(
          wordpressService, 
          'updateStepProcessingHistory', 
          [postId, 'complete_reprocess', {
            timestamp: new Date().toISOString(),
            user: req.user?.name || 'Unknown User',
            status: 'completed',
            message: `Successfully forwarded to appraisals-backend for complete reprocessing`
          }]
        );
      } catch (backendError) {
        // Log error but don't fail the request since we've already sent a response
        console.error(`❌ [reprocessCompleteAppraisal] Error from appraisals-backend:`, backendError.message);
        
        // Update the processing status in sheets with error
        await safeServiceCall(
          sheetsService, 
          'updateProcessingStatus', 
          [id, `Complete reprocessing failed: ${backendError.message}`]
        );
        
        // Update WordPress with error status
        await safeServiceCall(
          wordpressService, 
          'updateStepProcessingHistory', 
          [postId, 'complete_reprocess', {
            timestamp: new Date().toISOString(),
            user: req.user?.name || 'Unknown User',
            status: 'error',
            message: `Error from appraisals-backend: ${backendError.message}`
          }]
        );
      }
    } catch (error) {
      console.error(`❌ [reprocessCompleteAppraisal] Error:`, error);
      
      // Try to update sheets with error
      await safeServiceCall(
        sheetsService, 
        'updateProcessingStatus', 
        [id, `Complete reprocessing failed: ${error.message}`]
      );
      
      // Only send error response if we haven't sent a response yet
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: `Error submitting appraisal for complete reprocessing: ${error.message}`
        });
      }
    }
  }

  /**
   * Send confirmation email to customer with appraisal details and PDF link
   */
  static async sendConfirmationEmail(req, res) {
    const { id } = req.params;
    const { sessionId } = req.body || {};
    
    try {
      console.log(`[sendConfirmationEmail] Sending confirmation email for appraisal ID: ${id}`);
      
      /* ------------------------------------------------------------
       * Validate that the row <id> really belongs to the given session.
       * We first check the pending sheet (column C). If it does not match
       * we look at the same row in the completed sheet. If still no match
       * we abort – this prevents sending the email to the wrong customer.
       * ------------------------------------------------------------ */
      
      const pendingSheetName   = config.GOOGLE_SHEET_NAME    || 'Pending Appraisals';
      const completedSheetName = config.COMPLETED_SHEET_NAME || 'Completed Appraisals';
      
      const sheetId = config.PENDING_APPRAISALS_SPREADSHEET_ID;
      
      // Helper function to read column C (session identifier) for the given row in a sheet
      const readSessionId = async (sheetName) => {
        const values = await sheetsService.getValues(sheetId, `'${sheetName}'!C${id}`);
        return (values && values[0] && values[0][0]) ? values[0][0] : '';
      };
      
      let sheetInUse = pendingSheetName;
      let sheetSessionId = await readSessionId(sheetInUse);
      
      // If not matching, try completed sheet
      if (sessionId && sheetSessionId !== sessionId) {
        sheetInUse = completedSheetName;
        sheetSessionId = await readSessionId(sheetInUse);
      }
      
      // After trying both sheets, if still mismatch → abort
      if (sessionId && sheetSessionId !== sessionId) {
        console.warn(`[sendConfirmationEmail] Session-ID mismatch (expected ${sessionId}, found ${sheetSessionId}). Aborting email send.`);
        return res.status(400).json({
          success: false,
          message: 'Session ID mismatch – confirmation email not sent.'
        });
      }
      
      // Use the sheet we finally determined (pending or completed) for the rest of the method
      const sheet = sheetInUse;
      
      // First, find the WordPress post ID associated with this appraisal
      console.log(`🔄 Getting WordPress post ID for appraisal ID: ${id}`);
      const postId = await sheetsService.getWordPressPostIdFromAppraisalId(id);
      
      if (!postId) {
        console.error(`[sendConfirmationEmail] WordPress post ID not found for appraisal ID: ${id}`);
        return res.status(404).json({
          success: false,
          message: 'Appraisal not found.'
        });
      }
      
      // Get customer data and links from the sheets
      // Get customer info (columns D-E) and links (columns M and P)
      const range = `D${id}:P${id}`;
      const sheetData = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${sheet}!${range}`
      );
      
      let customerEmail = '';
      let customerName = '';
      let pdfLink = '';
      let wpLink = '';
      let value = '';
      
      if (sheetData && sheetData.length > 0 && sheetData[0].length >= 2) {
        customerEmail = sheetData[0][0] || ''; // Column D
        customerName = sheetData[0][1] || '';  // Column E
        
        // Value is in column J (index 6)
        if (sheetData[0].length >= 7) {
          value = sheetData[0][6] || '';
        }
        
        // PDF link is in column M (index 9)
        if (sheetData[0].length >= 10) {
          pdfLink = sheetData[0][9] || '';
        }
        
        // WP post link is in column P (index 12)
        if (sheetData[0].length >= 13) {
          wpLink = sheetData[0][12] || '';
        }
      }
      
      if (!customerEmail) {
        console.error(`[sendConfirmationEmail] Customer email not found for appraisal ID: ${id}`);
        return res.status(400).json({
          success: false,
          message: 'Customer email not found.'
        });
      }
      
      // Construct appraisal data from sheet values
      const appraisalData = {
        value: value || 'N/A',
        description: 'See attached PDF for complete appraisal details.',
        pdfLink: pdfLink || '',
        wpLink: wpLink || ''
      };
      
      console.log(`[sendConfirmationEmail] Using PDF link: ${appraisalData.pdfLink}`);
      console.log(`[sendConfirmationEmail] Using WordPress link: ${appraisalData.wpLink}`);
      
      if (!appraisalData.pdfLink) {
        console.warn(`[sendConfirmationEmail] PDF link not found for appraisal ID: ${id}`);
        // Still proceed with sending the email, but log a warning
      }
      
      if (!appraisalData.wpLink) {
        console.warn(`[sendConfirmationEmail] WordPress post link not found for appraisal ID: ${id}`);
        // Still proceed with sending the email, but log a warning
      }
      
      // Send the notification through CRM service instead of direct email
      const crmService = require('../../services/crmService');
      const notificationSent = await crmService.sendAppraisalCompletedNotification(
        customerEmail,
        customerName,
        appraisalData
      );
      
      if (!notificationSent) {
        console.error(`[sendConfirmationEmail] Failed to send notification for appraisal ID: ${id}`);
        return res.status(500).json({
          success: false,
          message: 'Failed to send confirmation notification via CRM service.'
        });
      }
      
      // Update the email status in Google Sheets (column Q)
      const emailStatus = `CRM notification sent for appraisal #${id} on ${new Date().toISOString()}`;
      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${sheet}!Q${id}`,
        [[emailStatus]]
      );
      
      console.log(`[sendConfirmationEmail] CRM notification sent successfully for ${customerEmail} (appraisal ID: ${id})`);
      
      return res.json({
        success: true,
        message: 'Confirmation notification sent successfully via CRM',
        details: {
          id,
          postId,
          notificationSent: true,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error(`[sendConfirmationEmail] Error:`, error);
      return res.status(500).json({
        success: false,
        message: 'Error sending confirmation notification',
        error: error.message
      });
    }
  }
}

module.exports = AppraisalDetailsController;