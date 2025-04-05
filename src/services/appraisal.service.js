// Import services directly to avoid circular dependency issues
const sheetsService = require('./sheets.service');
const wordpressService = require('./wordpress.service');
const pubsubService = require('./pubsub.service');
const emailService = require('./email.service'); 
const openaiService = require('./openai.service');
const { config } = require('../config');
const { getImageUrl } = require('../utils/getImageUrl');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// Define helper functions locally to avoid circular dependencies
/**
 * Helper function to check if a service is available and working
 * @param {Object} service - The service to check
 * @param {string} methodName - The method to check for
 * @returns {boolean} - Whether the service is available
 */
function isServiceAvailable(service, methodName) {
  if (!service) {
    return false;
  }
  
  if (methodName && typeof service[methodName] !== 'function') {
    return false;
  }
  
  return true;
}

/**
 * Helper function to safely call a service method if available
 * @param {Object} service - The service to use
 * @param {string} methodName - The method to call
 * @param {Array} args - Arguments to pass to the method
 * @param {*} fallbackValue - Value to return if service is unavailable
 * @returns {Promise<*>} - Result of the method call or fallback value
 */
async function safeServiceCall(service, methodName, args = [], fallbackValue = null) {
  if (!isServiceAvailable(service, methodName)) {
    console.warn(`Service or method ${methodName} is not available, using fallback value`);
    return fallbackValue;
  }
  
  try {
    return await service[methodName](...args);
  } catch (error) {
    console.error(`Error calling service method ${methodName}:`, error);
    return fallbackValue;
  }
}

class AppraisalService {
  async processAppraisal(id, appraisalValue, description) {
    try {
      // Step 1: Set Value
      await this.setValue(id, appraisalValue, description);
      console.log('✓ Value set successfully');

      // Step 2: Merge Descriptions
      const mergedDescription = await this.mergeDescriptions(id, description);
      console.log('✓ Descriptions merged successfully');

      // Step 3: Update Title
      const postId = await this.updateTitle(id, mergedDescription);
      console.log('✓ Title updated successfully');

      // Step 4: Insert Template
      await this.insertTemplate(id);
      console.log('✓ Template inserted successfully');

      // Step 5: Build PDF
      await this.buildPdf(id);
      console.log('✓ PDF built successfully');

      // Step 6: Send Email
      await this.sendEmail(id);
      console.log('✓ Email sent successfully');

      // Step 7: Mark as Complete
      await this.complete(id, appraisalValue, description);
      console.log('✓ Appraisal marked as complete');

    } catch (error) {
      console.error('Error processing appraisal:', error);
      throw error;
    }
  }

  async setValue(id, appraisalValue, description, isEdit = false) {
    const sheetName = isEdit ? config.EDIT_SHEET_NAME : config.GOOGLE_SHEET_NAME;

    await sheetsService.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${sheetName}!J${id}:K${id}`,
      [[appraisalValue, description]]
    );

    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${sheetName}!G${id}`
    );

    const wordpressUrl = values[0][0];
    const postId = new URL(wordpressUrl).searchParams.get('post');

    await wordpressService.updatePost(postId, {
      acf: { value: appraisalValue }
    });
  }

  async mergeDescriptions(id, appraiserDescription) {
    try {
      // Get IA description from sheets
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!H${id}`
      );

      const iaDescription = values[0][0];
      if (!iaDescription) {
        throw new Error('IA description not found');
      }

      // Use our OpenAI service to merge descriptions
      const mergedDescription = await openaiService.mergeDescriptions(
        appraiserDescription,
        iaDescription
      );

      // Save merged description to sheets
      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!L${id}`,
        [[mergedDescription]]
      );

      return mergedDescription;
    } catch (error) {
      console.error('Error merging descriptions:', error);
      throw error;
    }
  }

  async updateTitle(id, mergedDescription) {
    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!G${id}`
    );

    const wordpressUrl = values[0][0];
    const postId = new URL(wordpressUrl).searchParams.get('post');

    await wordpressService.updatePost(postId, {
      title: mergedDescription
    });

    return postId;
  }

  async insertTemplate(id) {
    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!A${id}:G${id}`
    );

    const row = values[0];
    const appraisalType = row[1] || 'RegularArt';
    const wordpressUrl = row[6];
    const postId = new URL(wordpressUrl).searchParams.get('post');

    const wpData = await wordpressService.getPost(postId);
    let content = wpData.content?.rendered || '';

    if (!content.includes('[pdf_download]')) {
      content += '\n[pdf_download]';
    }

    if (!content.includes(`[AppraisalTemplates type="${appraisalType}"]`)) {
      content += `\n[AppraisalTemplates type="${appraisalType}"]`;
    }

    await wordpressService.updatePost(postId, {
      content,
      acf: {
        shortcodes_inserted: true
      }
    });
  }

  async buildPdf(id) {
    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!A${id}:G${id}`
    );

    const row = values[0];
    const wordpressUrl = row[6];
    const postId = new URL(wordpressUrl).searchParams.get('post');

    const wpData = await wordpressService.getPost(postId);
    const session_ID = wpData.acf?.session_id;

    const response = await fetch(
      'https://appraisals-backend-856401495068.us-central1.run.app/generate-pdf',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, session_ID })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to generate PDF');
    }

    const data = await response.json();
    await sheetsService.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!M${id}:N${id}`,
      [[data.pdfLink, data.docLink]]
    );

    return {
      pdfLink: data.pdfLink,
      docLink: data.docLink
    };
  }

  async sendEmail(id) {
    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!A${id}:N${id}`
    );

    const row = values[0];
    const customerEmail = row[3];
    const customerName = row[4];
    const wordpressUrl = row[6];
    const appraisalValue = row[9];
    const description = row[10];
    const pdfLink = row[12];

    await emailService.sendAppraisalCompletedEmail(customerEmail, customerName, {
      value: appraisalValue,
      description: description,
      pdfLink: pdfLink,
      wordpressUrl: wordpressUrl
    });
  }

  async complete(id, appraisalValue, description) {
    await sheetsService.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!F${id}`,
      [['Completed']]
    );

    await sheetsService.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!J${id}:K${id}`,
      [[appraisalValue, description]]
    );
  }

  /**
   * Enhance description by merging AI and appraiser descriptions
   * @param {string} appraisalId - Appraisal ID
   * @param {string} postId - WordPress post ID
   * @returns {Promise<object>} Result of the enhancement operation
   */
  async enhanceDescription(appraisalId, postId) {
    try {
      console.log(`🔄 Enhancing description for appraisal ${appraisalId} (WordPress post ${postId})...`);
      
      // Get appraisal data from Google Sheets
      const appraisal = await sheetsService.getPendingAppraisalById(appraisalId) || 
                        await sheetsService.getCompletedAppraisalById(appraisalId);
      
      if (!appraisal) {
        throw new Error(`Appraisal with ID ${appraisalId} not found`);
      }
      
      // Call the appraisals-backend service to enhance description
      console.log(`🔄 Calling appraisals-backend to enhance description for post ${postId}`);
      
      const response = await axios.post(
        `${config.APPRAISALS_BACKEND_URL || 'https://appraisals-backend-856401495068.us-central1.run.app'}/enhance-description`,
        {
          postId,
          updateContent: true
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
        throw new Error(response.data.message || 'Failed to enhance description');
      }
      
      // Update Google Sheets with the enhanced description status
      try {
        await sheetsService.updateProcessingStatus(appraisalId, 'Description enhanced');
      } catch (sheetsError) {
        console.warn('Warning: Could not update Google Sheets with enhanced description status:', sheetsError.message);
        // Continue even if sheets update fails
      }
      
      console.log('✅ Successfully enhanced description');
      return {
        success: true,
        message: 'Description enhanced successfully',
        details: response.data.details || {}
      };
    } catch (error) {
      console.error('❌ Error enhancing description:', error);
      throw error;
    }
  }

  /**
   * Update WordPress post with additional metadata
   * @param {string} appraisalId - Appraisal ID
   * @param {string} postId - WordPress post ID
   * @returns {Promise<object>} Result of the update operation
   */
  async updateWordPress(appraisalId, postId) {
    try {
      console.log(`🔄 Updating WordPress post ${postId} for appraisal ${appraisalId}...`);
      
      // Get appraisal data from Google Sheets
      const appraisal = await sheetsService.getPendingAppraisalById(appraisalId) || 
                        await sheetsService.getCompletedAppraisalById(appraisalId);
      
      if (!appraisal) {
        throw new Error(`Appraisal with ID ${appraisalId} not found`);
      }
      
      // Call the appraisals-backend service to update WordPress
      console.log(`🔄 Calling appraisals-backend to update WordPress for post ${postId}`);
      
      // Prepare ACF fields from appraisal data
      const acfFields = {
        appraisal_value: appraisal.value,
        appraisal_type: appraisal.appraisalType || 'Regular',
        appraisal_id: appraisalId,
        // Add other fields from sheets as needed
        last_updated: new Date().toISOString(),
        sheets_id: appraisalId
      };
      
      const response = await axios.post(
        `${config.APPRAISALS_BACKEND_URL || 'https://appraisals-backend-856401495068.us-central1.run.app'}/update-wordpress`,
        {
          postId,
          acfFields,
          insertShortcodes: true,
          appraisalType: appraisal.appraisalType || 'RegularArt'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.SHARED_SECRET || process.env.SHARED_SECRET}`
          },
          timeout: 60000 // 1 minute timeout
        }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update WordPress');
      }
      
      // Update Google Sheets with WordPress update status
      try {
        await sheetsService.updateProcessingStatus(appraisalId, 'WordPress updated');
      } catch (sheetsError) {
        console.warn('Warning: Could not update Google Sheets with WordPress update status:', sheetsError.message);
        // Continue even if sheets update fails
      }
      
      console.log('✅ Successfully updated WordPress post');
      return {
        success: true,
        message: 'WordPress post updated successfully',
        details: response.data.details || {}
      };
    } catch (error) {
      console.error('❌ Error updating WordPress:', error);
      throw error;
    }
  }

  /**
   * Generate HTML content for the appraisal report
   * @param {string} appraisalId - Appraisal ID
   * @param {string} postId - WordPress post ID
   * @returns {Promise<object>} Result of the HTML generation operation
   */
  async generateHtmlContent(appraisalId, postId) {
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
   * @param {string} appraisalId - Appraisal ID
   * @param {string} postId - WordPress post ID
   * @returns {Promise<object>} Result of the PDF generation operation
   */
  async generatePDF(appraisalId, postId) {
    try {
      console.log(`🔄 Generating PDF for appraisal ${appraisalId} (WordPress post ${postId})...`);
      
      // Call the appraisals-backend service to generate the PDF
      const session_ID = uuidv4(); // Generate a new session ID
      
      const response = await axios.post(
        `${config.APPRAISALS_BACKEND_URL || 'https://appraisals-backend-856401495068.us-central1.run.app'}/generate-pdf`,
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
   * @param {string} appraisalId - Appraisal ID
   * @param {string} postId - WordPress post ID
   * @returns {Promise<object>} Result of the statistics regeneration operation
   */
  async regenerateStatistics(appraisalId, postId) {
    try {
      console.log(`🔄 Regenerating statistics for appraisal ${appraisalId} (WordPress post ${postId})...`);
      
      // Update Google Sheets to indicate we're starting the process - use safe call
      await safeServiceCall(
        sheetsService, 
        'updateProcessingStatus',
        [appraisalId, 'Regenerating statistics - Started']
      );
      
      // Validate that postId exists
      if (!postId) {
        throw new Error('WordPress Post ID is required');
      }
      
      // Try to validate the post exists using WordPress service, but don't block on failure
      try {
        // Check if the WordPress Service is properly initialized
        if (!wordpressService) {
          console.warn('⚠️ Warning: WordPress service appears to be undefined');
          console.log('🔧 Attempting to re-import WordPress service directly...');
          // Try to re-import the service directly
          const wpService = require('./wordpress.service');
          // If it was imported successfully, replace the reference
          if (wpService) {
            console.log('✅ Successfully re-imported WordPress service');
            // We can't modify the global variable, but we can use the local reference
            // for verification purposes
            
            // Check if the reimported service has the required methods
            if (!wpService.getPost) {
              console.warn('⚠️ Re-imported WordPress service is missing getPost method');
            } else {
              try {
                const basicPostCheck = await wpService.getPost(postId);
                if (basicPostCheck) {
                  console.log(`✅ Verified WordPress post ${postId} exists using re-imported service`);
                }
              } catch (getPostError) {
                console.warn(`⚠️ Could not verify post with re-imported service: ${getPostError.message}`);
              }
            }
          } else {
            throw new Error('Failed to re-import WordPress service');
          }
        } else {
          // Check if the service has the required methods
          if (!wordpressService.getPost) {
            console.warn('⚠️ WordPress service is missing getPost method');
          } else {
            // Try to get WordPress post details to validate it exists
            // First check if the post exists without fetching all metadata
            const basicPostCheck = await wordpressService.getPost(postId);
            
            if (!basicPostCheck) {
              throw new Error(`WordPress post with ID ${postId} not found`);
            }
            
            console.log(`✅ Verified WordPress post ${postId} exists`);
          }
        }
      } catch (wpError) {
        console.warn(`⚠️ Warning: Could not verify WordPress post: ${wpError.message}`);
        // Continue even if we can't verify the post exists - the appraisals-backend will handle this
      }
      
      // Call the appraisals-backend service to regenerate statistics and HTML visualizations
      console.log(`🔄 Calling appraisals-backend to regenerate statistics and HTML visualizations for post ${postId}`);
      
      // Ensure we have the API URL
      const apiUrl = config.APPRAISALS_BACKEND_URL || 'https://appraisals-backend-856401495068.us-central1.run.app';
      
      const response = await axios.post(
        `${apiUrl}/regenerate-statistics-and-visualizations`,
        {
          postId
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.SHARED_SECRET || process.env.SHARED_SECRET}`
          },
          timeout: 300000 // 5 minute timeout for this operation
        }
      );
      
      if (!response.data.success) {
        // Track the failure in Google Sheets - use safe call
        await safeServiceCall(
          sheetsService,
          'updateProcessingStatus', 
          [appraisalId, `Statistics regeneration failed: ${response.data.message || 'Unknown error'}`]
        );
        
        throw new Error(response.data.message || 'Failed to regenerate statistics and visualizations');
      }
      
      // Update Google Sheets with successful regeneration status - use safe call
      const statsDetails = response.data.details?.statistics ? 
        `Statistics regenerated: ${response.data.details.statistics.count || 0} results, confidence: ${response.data.details.statistics.confidence_level || 'N/A'}` :
        'Statistics regenerated successfully';
        
      await safeServiceCall(
        sheetsService, 
        'updateProcessingStatus', 
        [appraisalId, statsDetails]
      );
      
      console.log('✅ Successfully regenerated statistics and HTML visualizations');
      return {
        success: true,
        message: 'Statistics and HTML visualizations regenerated successfully',
        details: response.data.details || {}
      };
    } catch (error) {
      console.error('❌ Error regenerating statistics:', error);
      
      // Provide more details about the error
      const errorMessage = error.response?.data?.message || error.message;
      const errorDetails = error.response?.data?.error || '';
      
      console.error(`❌ Error details: ${errorMessage} ${errorDetails}`);
      
      // Record the error in Google Sheets if we have an appraisal ID - use safe call
      if (appraisalId) {
        await safeServiceCall(
          sheetsService,
          'updateProcessingStatus',
          [appraisalId, `Error regenerating statistics: ${errorMessage.substring(0, 100)}`]
        );
      }
      
      throw new Error(`Failed to regenerate statistics: ${errorMessage}`);
    }
  }
}

module.exports = new AppraisalService();