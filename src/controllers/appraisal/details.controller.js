const { sheetsService, wordpressService, appraisalService, isServiceAvailable, safeServiceCall } = require('../../services');
const { config } = require('../../config');
const { getImageUrl } = require('../../utils/getImageUrl');

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
          lastProcessed: postDetails.meta?.last_processed || '',
          processingSteps: postDetails.meta?.processing_steps || {},
          processingHistory: postDetails.meta?.processing_history || []
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
      // Track the processing in Google Sheets - use safe call to avoid errors
      await safeServiceCall(
        sheetsService, 
        'updateProcessingStatus', 
        [id, `Reprocessing ${stepName} - Started`]
      );
      
      // Get WordPress post ID from the appraisal ID - use safe call but we need the result
      console.log(`🔍 [reprocessAppraisalStep] Getting WordPress post ID for appraisal ID: ${id}`);
      const postId = await sheetsService.getWordPressPostIdFromAppraisalId(id);
      
      if (!postId) {
        console.error(`❌ [reprocessAppraisalStep] Appraisal ${id} not found or has no WordPress post ID`);
        
        // Try to update the failure in sheets - use safe call
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
      
      console.log(`🔄 [reprocessAppraisalStep] Processing step "${stepName}" for appraisal ID: ${id}, WordPress post ID: ${postId}`);
      
      // Process the specific step based on stepName
      let result;
      
      try {
        // Check if appraisalService is available
        if (!isServiceAvailable(appraisalService, stepName)) {
          throw new Error(`Appraisal service missing method for step: ${stepName}`);
        }
        
        switch (stepName) {
          case 'enhance_description':
            console.log(`🔄 [reprocessAppraisalStep] Enhancing description for appraisal ID: ${id}`);
            result = await appraisalService.enhanceDescription(id, postId);
            break;
          case 'update_wordpress':
            console.log(`🔄 [reprocessAppraisalStep] Updating WordPress for appraisal ID: ${id}`);
            result = await appraisalService.updateWordPress(id, postId);
            break;
          case 'generate_html':
            console.log(`🔄 [reprocessAppraisalStep] Generating HTML content for appraisal ID: ${id}`);
            result = await appraisalService.generateHtmlContent(id, postId);
            break;
          case 'generate_pdf':
            console.log(`🔄 [reprocessAppraisalStep] Generating PDF for appraisal ID: ${id}`);
            result = await appraisalService.generatePDF(id, postId);
            break;
          case 'regenerate_statistics':
            console.log(`🔄 [reprocessAppraisalStep] Regenerating statistics for appraisal ID: ${id}`);
            result = await appraisalService.regenerateStatistics(id, postId);
            break;
          default:
            console.warn(`❌ [reprocessAppraisalStep] Unknown step: ${stepName}`);
            
            // Update sheets with the error - use safe call
            await safeServiceCall(
              sheetsService, 
              'updateProcessingStatus', 
              [id, `Reprocessing failed: Unknown step "${stepName}"`]
            );
            
            return res.status(400).json({
              success: false,
              message: `Unknown step: ${stepName}`
            });
        }
      } catch (stepError) {
        console.error(`❌ [reprocessAppraisalStep] Error processing step "${stepName}":`, stepError);
        
        // Log the error in WordPress metadata - use safe call
        const timestamp = new Date().toISOString();
        await safeServiceCall(
          wordpressService, 
          'updateStepProcessingHistory', 
          [postId, stepName, {
            timestamp,
            user: req.user?.name || 'Unknown User',
            status: 'failed',
            error: stepError.message
          }]
        );
        
        // Update sheets with the error - use safe call
        await safeServiceCall(
          sheetsService, 
          'updateProcessingStatus', 
          [id, `${stepName} failed: ${stepError.message.substring(0, 100)}`]
        );
        
        throw stepError; // Re-throw to be caught by the outer try/catch
      }
      
      // Log the successful reprocessing action in WordPress metadata - use safe call
      const timestamp = new Date().toISOString();
      await safeServiceCall(
        wordpressService, 
        'updateStepProcessingHistory', 
        [postId, stepName, {
          timestamp,
          user: req.user?.name || 'Unknown User',
          status: 'completed'
        }]
      );
      
      // Update final success status in sheets - use safe call
      await safeServiceCall(
        sheetsService, 
        'updateProcessingStatus', 
        [id, `${stepName} completed successfully`]
      );
      
      console.log(`✅ [reprocessAppraisalStep] Successfully reprocessed step "${stepName}" for appraisal ID: ${id}`);
      
      return res.json({
        success: true,
        message: `Successfully reprocessed step: ${stepName}`,
        result
      });
    } catch (error) {
      console.error(`❌ [reprocessAppraisalStep] Error reprocessing step "${stepName}" for appraisal ID: ${id}:`, error);
      
      return res.status(500).json({
        success: false,
        message: `Error reprocessing step: ${stepName}`,
        error: error.message,
        details: error.details || {}
      });
    }
  }
}

module.exports = AppraisalDetailsController;