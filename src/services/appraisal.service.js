const { 
  sheetsService, 
  wordpressService,
  pubsubService,
  emailService,
  openaiService 
} = require('../services');
const { config } = require('../config');
const { getImageUrl } = require('../utils/getImageUrl');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

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
      
      // Get AI description and appraiser description
      const aiDescription = appraisal.iaDescription || '';
      const appraiserDescription = appraisal.appraisersDescription || '';
      
      if (!aiDescription) {
        throw new Error('AI description not found');
      }
      
      if (!appraiserDescription) {
        throw new Error('Appraiser description not found');
      }
      
      // Use OpenAI to merge descriptions
      const mergedDescription = await openaiService.mergeDescriptions(
        appraiserDescription,
        aiDescription
      );
      
      // Update the WordPress post with the merged description
      await wordpressService.updatePostField(postId, 'content', mergedDescription);
      
      // Update Google Sheets with the merged description
      await sheetsService.updateMergedDescription(appraisalId, mergedDescription);
      
      console.log('✅ Successfully enhanced description');
      return {
        success: true,
        mergedDescription
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
      
      // Get WordPress post details
      const postDetails = await wordpressService.getPostWithMetadata(postId);
      
      // Update ACF fields
      const acfData = {
        appraisal_value: appraisal.value,
        appraisal_type: appraisal.appraisalType || 'Regular',
        appraisal_id: appraisalId,
        // Add other fields as needed
      };
      
      // Update the WordPress post ACF fields
      await wordpressService.updatePost(postId, {
        acf: acfData
      });
      
      // Insert template shortcodes if they don't exist
      const content = postDetails.content?.rendered || '';
      let updatedContent = content;
      const appraisalType = appraisal.appraisalType || 'RegularArt';
      
      if (!updatedContent.includes('[pdf_download]')) {
        updatedContent += '\n[pdf_download]';
      }
      
      if (!updatedContent.includes(`[AppraisalTemplates type="${appraisalType}"]`)) {
        updatedContent += `\n[AppraisalTemplates type="${appraisalType}"]`;
      }
      
      if (updatedContent !== content) {
        await wordpressService.updatePostField(postId, 'content', updatedContent);
      }
      
      console.log('✅ Successfully updated WordPress post');
      return {
        success: true,
        message: 'WordPress post updated successfully'
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
      const response = await axios.post(
        `${config.APPRAISALS_BACKEND_URL || 'https://appraisals-backend-856401495068.us-central1.run.app'}/html-content`,
        {
          postId,
          contentType: 'enhanced-analytics'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.SHARED_SECRET || process.env.SHARED_SECRET}`
          }
        }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to generate HTML content');
      }
      
      console.log('✅ Successfully generated HTML content');
      return response.data;
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
      
      // Get WordPress post details to validate it exists
      const postDetails = await wordpressService.getPostWithMetadata(postId);
      
      if (!postDetails) {
        throw new Error(`WordPress post with ID ${postId} not found`);
      }
      
      // Call the appraisals-backend service to regenerate statistics and HTML visualizations
      console.log(`🔄 Calling appraisals-backend to regenerate statistics and HTML visualizations for post ${postId}`);
      
      const response = await axios.post(
        `${config.APPRAISALS_BACKEND_URL || 'https://appraisals-backend-856401495068.us-central1.run.app'}/regenerate-statistics-and-visualizations`,
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
        throw new Error(response.data.message || 'Failed to regenerate statistics and visualizations');
      }
      
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
      
      throw new Error(`Failed to regenerate statistics: ${errorMessage}`);
    }
  }
}

module.exports = new AppraisalService();