const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const config = require('../config');
const { isServiceAvailable, safeServiceCall } = require('./index');
const { cleanDataForWordPress } = require('./appraisalUtils');

// Service dependencies
let wordpressService, sheetsService, openaiService, pdfService, storageService;

class AppraisalService {
  constructor(services) {
    console.log('🔄 Initializing Appraisal Service');
    ({
      wordpressService, 
      sheetsService, 
      openaiService, 
      pdfService,
      storageService
    } = services);
  }
  
  /**
   * Generate a new appraisal
   * @param {Object} appraisalData - Appraisal data
   * @returns {Promise<Object>} Generated appraisal ID
   */
  async createAppraisal(appraisalData) {
    try {
      console.log('🔄 Creating new appraisal:', JSON.stringify(appraisalData).substring(0, 100) + '...');
      
      // Validate required fields
      if (!appraisalData.customerEmail) {
        throw new Error('Customer email is required');
      }
      
      if (!appraisalData.iaDescription && !appraisalData.customerDescription) {
        throw new Error('At least one description (AI or customer) is required');
      }
      
      // Generate a new session ID
      const sessionId = uuidv4();
      console.log(`🔄 Generated session ID: ${sessionId}`);
      
      // Add the appraisal to the Google Sheets
      const appraisalId = await sheetsService.addAppraisal({
        ...appraisalData,
        sessionId,
        status: 'Pending',
        dateCreated: new Date().toISOString()
      });
      
      console.log(`✅ Appraisal created with ID: ${appraisalId} and session ID: ${sessionId}`);
      return {
        appraisalId,
        sessionId
      };
    } catch (error) {
      console.error('❌ Error creating appraisal:', error);
      throw error;
    }
  }

  /**
   * Create a WordPress post for the appraisal
   * @param {string} appraisalId - Appraisal ID
   * @returns {Promise<Object>} WordPress post ID and URL
   */
  async createWordPressPost(appraisalId) {
    try {
      console.log(`🔄 Creating WordPress post for appraisal ${appraisalId}...`);
      
      // Get the appraisal details from the sheet
      const appraisal = await sheetsService.getAppraisal(appraisalId);
      if (!appraisal) {
        throw new Error(`Appraisal ${appraisalId} not found`);
      }
      
      console.log(`✅ Found appraisal: ${appraisal.id}`);
      
      // Choose the best description available
      const description = appraisal.aiDescription || appraisal.customerDescription || 'No description available';
      
      // Clean up data for WordPress
      const title = cleanDataForWordPress(description.substring(0, 100) + '...');
      const content = cleanDataForWordPress(`<p>${description}</p>`);
      
      // Generate ACF fields
      const acfFields = {
        // Basic appraisal fields
        appraisaltype: appraisal.type || 'Regular',
        status: 'Pending',
        session_id: appraisal.sessionId || uuidv4(),
        
        // Store original descriptions as ACF fields
        customer_description: appraisal.customerDescription || '',
        appraiser_description: appraisal.appraisersDescription || '',
        iaDescription: appraisal.aiDescription || '',
        
        // Store customer info
        customer_email: appraisal.customerEmail || '',
        customer_name: appraisal.customerName || ''
      };
      
      // Create the WordPress post
      const postId = await wordpressService.createPost({
        title,
        content,
        acfFields
      });
      
      if (!postId) {
        throw new Error('Failed to create WordPress post');
      }
      
      // Update the appraisal in Google Sheets with the WordPress post ID
      await sheetsService.updateWordPressPostId(appraisalId, postId);
      
      // Get the WordPress post URL
      const postUrl = await wordpressService.getPostEditUrl(postId);
      
      console.log(`✅ WordPress post created for appraisal ${appraisalId} with post ID: ${postId}`);
      return {
        postId,
        postUrl
      };
    } catch (error) {
      console.error(`❌ Error creating WordPress post for appraisal ${appraisalId}:`, error);
      
      // Update status in sheets
      await sheetsService.updateStatus(appraisalId, `Error creating WP post: ${error.message}`);
      
      throw error;
    }
  }
  
  /**
   * Enhance the description using OpenAI
   * @deprecated This method is deprecated. Description enhancement is now handled by the reprocessAppraisalStep controller which delegates to appraisals-backend.
   * @param {string} appraisalId - Appraisal ID
   * @param {string} postId - WordPress post ID
   * @returns {Promise<Object>} Enhanced description
   */
  async enhanceDescription(appraisalId, postId) {
    console.log(`⚠️ [DEPRECATED] enhanceDescription method called for appraisal ${appraisalId}`);  
    console.log(`⚠️ Description enhancement should be handled by the appraisals-backend service directly`);
    try {
      console.log(`🔄 Enhancing description for appraisal ${appraisalId} (WordPress post ${postId})...`);
      
      // Get the appraisal descriptions - first try Google Sheets
      let appraisal;
      try {
        appraisal = await sheetsService.getAppraisal(appraisalId);
      } catch (sheetsError) {
        console.warn('⚠️ Warning: Could not get appraisal from sheets:', sheetsError.message);
        // If we can't get from sheets, continue and try WordPress
      }
      
      // If we couldn't get from sheets or missing data, get from WordPress
      if (!appraisal || !appraisal.customerDescription) {
        try {
          console.log('🔄 Fetching descriptions from WordPress...');
          const post = await wordpressService.getPostWithMeta(postId);
          
          // Extract descriptions from ACF fields
          appraisal = {
            customerDescription: post.acf?.customer_description || '',
            appraisersDescription: post.acf?.appraiser_description || '',
            aiDescription: post.acf?.enhanced_description || post.acf?.ia_description || ''
          };
        } catch (wpError) {
          console.error('❌ Error fetching from WordPress:', wpError);
          throw new Error(`Could not get descriptions from either source: ${wpError.message}`);
        }
      }
      
      // Check if we have a description to enhance
      const customerDescription = appraisal?.customerDescription || '';
      const appraiserDescription = appraisal?.appraisersDescription || '';
      
      if (!customerDescription && !appraiserDescription) {
        throw new Error('No description available to enhance');
      }
      
      // Use the customer description as primary, fall back to appraiser description
      const descriptionToEnhance = customerDescription || appraiserDescription;
      console.log(`🔄 Enhancing description: ${descriptionToEnhance.substring(0, 100)}...`);
      
      // Call OpenAI to enhance the description
      const enhancedDescription = await openaiService.enhanceDescription(descriptionToEnhance);
      
      if (!enhancedDescription) {
        throw new Error('Failed to enhance description - empty response from AI service');
      }
      
      console.log(`✅ Enhanced description generated: ${enhancedDescription.substring(0, 100)}...`);
      
      // Update the WordPress post with the enhanced description
      await wordpressService.updateEnhancedDescription(postId, enhancedDescription);
      
      // Track in Google Sheets
      await sheetsService.updateStatus(appraisalId, 'Enhanced description generated');
      
      return {
        success: true,
        enhancedDescription
      };
    } catch (error) {
      console.error('❌ Error enhancing description:', error);
      
      // Update status in sheets
      if (appraisalId) {
        await sheetsService.updateStatus(appraisalId, `Error enhancing description: ${error.message}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Update WordPress post with metadata
   * @deprecated This method is deprecated. WordPress updates are now handled by the reprocessAppraisalStep controller which delegates to appraisals-backend.
   * @param {string} appraisalId - Appraisal ID
   * @param {string} postId - WordPress post ID
   * @returns {Promise<Object>} Update result
   */
  async updateWordPress(appraisalId, postId) {
    console.log(`⚠️ [DEPRECATED] updateWordPress method called for appraisal ${appraisalId}`);  
    console.log(`⚠️ WordPress updates should be handled by the appraisals-backend service directly`);
    try {
      console.log(`🔄 Updating WordPress post for appraisal ${appraisalId} (post ID: ${postId})...`);
      
      // Get the enhanced description
      const post = await wordpressService.getPostWithMeta(postId);
      const enhancedDescription = post.acf?.enhanced_description || post.acf?.ia_description || '';
      
      if (!enhancedDescription) {
        console.warn('⚠️ No enhanced description found, using original content');
      }
      
      // Update the WordPress post with the enhanced description
      await wordpressService.updatePost(postId, {
        // Use the enhanced description as the main content if available
        content: enhancedDescription 
          ? `<p>${enhancedDescription}</p>` 
          : post.content?.rendered || post.content || '',
        
        // Update status in ACF fields
        acf: {
          status: 'Processing'
        }
      });
      
      // Track in Google Sheets
      await sheetsService.updateStatus(appraisalId, 'WordPress post updated');
      
      return {
        success: true,
        message: 'WordPress post updated with enhanced description'
      };
    } catch (error) {
      console.error('❌ Error updating WordPress post:', error);
      
      // Update status in sheets
      if (appraisalId) {
        await sheetsService.updateStatus(appraisalId, `Error updating WordPress: ${error.message}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Generate HTML content for the appraisal
   * @deprecated This method is deprecated. HTML generation is now handled by the reprocessAppraisalStep controller which delegates to appraisals-backend.
   * @param {string} appraisalId - Appraisal ID
   * @param {string} postId - WordPress post ID
   * @returns {Promise<object>} Result of the HTML generation operation
   */
  async generateHtmlContent(appraisalId, postId) {
    console.log(`⚠️ [DEPRECATED] generateHtmlContent method called for appraisal ${appraisalId}`);  
    console.log(`⚠️ HTML generation should be handled by the appraisals-backend service directly`);
    try {
      console.log(`🔄 Generating HTML content for appraisal ${appraisalId} (WordPress post ${postId})...`);
      
      // Call the appraisals-backend service to generate HTML content
      console.log(`🔄 Calling appraisals-backend to generate HTML content for post ${postId}`);
      
      const response = await axios.post(
        `${config.APPRAISALS_BACKEND_URL || 'https://appraisals-backend-856401495068.us-central1.run.app'}/html-content`,
        {
          postId,
          contentType: 'enhanced-analytics' // Request both types of visualization
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.SHARED_SECRET || process.env.SHARED_SECRET}`
          },
          timeout: 180000 // 3 minute timeout
        }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to generate HTML content');
      }
      
      // Update Google Sheets with HTML generation status
      try {
        await sheetsService.updateProcessingStatus(appraisalId, 'HTML content generated');
      } catch (sheetsError) {
        console.warn('Warning: Could not update Google Sheets with HTML generation status:', sheetsError.message);
        // Continue even if sheets update fails
      }
      
      console.log('✅ Successfully generated HTML content');
      return {
        success: true,
        message: 'HTML content generated successfully',
        details: response.data.details || {}
      };
    } catch (error) {
      console.error('❌ Error generating HTML content:', error);
      throw error;
    }
  }

  /**
   * Generate PDF for the appraisal
   * @deprecated This method is deprecated. PDF generation is now handled by the reprocessAppraisalStep controller which delegates to appraisals-backend.
   * @param {string} appraisalId - Appraisal ID
   * @param {string} postId - WordPress post ID
   * @returns {Promise<object>} Result of the PDF generation operation
   */
  async generatePDF(appraisalId, postId) {
    console.log(`⚠️ [DEPRECATED] generatePDF method called for appraisal ${appraisalId}`);  
    console.log(`⚠️ PDF generation should be handled by the appraisals-backend service directly`);
    try {
      console.log(`🔄 Generating PDF for appraisal ${appraisalId} (WordPress post ${postId})...`);
      
      // Call the appraisals-backend service to generate the PDF
      const session_ID = uuidv4(); // Generate a new session ID
      
      const response = await axios.post(
        `${config.APPRAISALS_BACKEND_URL || 'https://appraisals-backend-856401495068.us-central1.run.app'}/api/pdf/generate-pdf`,
        {
          postId,
          session_ID
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.SHARED_SECRET || process.env.SHARED_SECRET}`
          }
        }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to generate PDF');
      }
      
      // Update the Google Sheets with the PDF URL if we have a valid appraisal ID
      // that can be parsed as an integer (not a WordPress post ID)
      if (appraisalId && !isNaN(parseInt(appraisalId))) {
        await sheetsService.updatePdfUrl(appraisalId, response.data.pdfUrl);
      }
      
      console.log('✅ Successfully generated PDF');
      return {
        success: true,
        pdfUrl: response.data.pdfUrl,
        docUrl: response.data.docUrl
      };
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      throw error;
    }
  }

  /**
   * Regenerate statistics for the appraisal
   * NOTE: This method has been deprecated.
   * Statistics regeneration is now handled directly by the appraisals-backend service
   * via the controller. See the regenerate_statistics case in the reprocessAppraisalStep controller method.
   * 
   * @deprecated Statistics regeneration is now delegated to appraisals-backend service
   * @param {string} appraisalId - Appraisal ID
   * @param {string} postId - WordPress post ID
   * @returns {Promise<object>} Result of the statistics regeneration operation
   */
  async regenerateStatistics(appraisalId, postId) {
    console.log(`⚠️ [DEPRECATED] regenerateStatistics method called for appraisal ${appraisalId}`);
    console.log(`⚠️ Statistics regeneration should be handled by the appraisals-backend service directly`);
    
    try {
      // Just update Google Sheets to indicate this is deprecated
      await safeServiceCall(
        sheetsService, 
        'updateProcessingStatus',
        [appraisalId, 'DEPRECATED: Statistics regeneration now happens in controller']
      );
      
      // Return a message directing to use the controller implementation instead
      return {
        success: false,
        message: 'This method is deprecated. Statistics regeneration is now handled by the reprocessAppraisalStep controller.',
        details: {
          reason: 'Architecture change: Statistics regeneration now delegated directly to appraisals-backend service',
          solution: 'Use the reprocessAppraisalStep controller with step="regenerate_statistics"',
          postId
        }
      };
    } catch (error) {
      console.error('❌ Error in deprecated regenerateStatistics method:', error);
      
      // Record the error in Google Sheets if we have an appraisal ID
      if (appraisalId) {
        await safeServiceCall(
          sheetsService,
          'updateProcessingStatus',
          [appraisalId, `Error in deprecated method: ${error.message}`]
        );
      }
      
      throw new Error(`Failed in deprecated method: ${error.message}`);
    }
  }
  
  /**
   * Complete the appraisal process
   * @param {string} appraisalId - Appraisal ID 
   * @param {string} postId - WordPress post ID
   * @param {number} appraisalValue - Appraisal value
   * @param {string} description - Appraisal description
   */
  async completeAppraisal(appraisalId, postId, appraisalValue, description) {
    try {
      console.log(`🔄 Completing appraisal ${appraisalId} (post ID: ${postId}) with value: ${appraisalValue}`);
      
      // Update WordPress with the appraisal value
      await wordpressService.updatePostACFFields(postId, {
        value: appraisalValue,
        appraiser_description: description || '',
        status: 'Completed'
      });
      
      // Update Google Sheets
      await sheetsService.updateAppraisalValue(appraisalId, appraisalValue);
      await sheetsService.updateStatus(appraisalId, 'Completed');
      
      return {
        success: true,
        message: 'Appraisal completed successfully'
      };
    } catch (error) {
      console.error('❌ Error completing appraisal:', error);
      
      // Update status in sheets
      if (appraisalId) {
        await sheetsService.updateStatus(appraisalId, `Error completing appraisal: ${error.message}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Process a single step for the appraisal
   * @deprecated This method is deprecated. All step processing is now handled by the reprocessAppraisalStep controller
   * which delegates to appraisals-backend directly. Use the controller approach instead.
   * @param {string} appraisalId - Appraisal ID
   * @param {string} postId - WordPress post ID
   * @param {string} step - Processing step
   */
  async processStep(appraisalId, postId, step) {
    console.log(`⚠️ [DEPRECATED] processStep method called for appraisal ${appraisalId}, step: ${step}`);
    console.log(`⚠️ All step processing should now be handled by the reprocessAppraisalStep controller`);
    console.log(`⚠️ which delegates directly to the appraisals-backend service.`);
    
    try {
      console.log(`🔄 Processing step "${step}" for appraisal ${appraisalId} (post ID: ${postId}) - DEPRECATED METHOD`);
      
      // Update Google Sheets to indicate this is deprecated
      await safeServiceCall(
        sheetsService, 
        'updateProcessingStatus',
        [appraisalId, `DEPRECATED: Step processing now happens in controller, step: ${step}`]
      );
      
      // Return a message directing to use the controller implementation instead
      return {
        success: false,
        message: `This method is deprecated. Step "${step}" processing is now handled by the reprocessAppraisalStep controller.`,
        details: {
          reason: 'Architecture change: All step processing now delegated directly to appraisals-backend service',
          solution: 'Use the reprocessAppraisalStep controller with appropriate step parameter',
          appraisalId,
          postId,
          step
        }
      };
    } catch (error) {
      console.error(`❌ Error in deprecated processStep method for "${step}":`, error);
      throw new Error(`Failed in deprecated method: ${error.message}`);
    }
  }
}

module.exports = AppraisalService;