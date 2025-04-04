const { sheetsService, wordpressService, appraisalService } = require('../../services');
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
      
      // Get all WordPress post metadata
      const postDetails = await wordpressService.getPostWithMetadata(postId);
      
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
    
    if (!stepName) {
      return res.status(400).json({
        success: false,
        message: 'Step name is required'
      });
    }
    
    try {
      // Get WordPress post ID from the appraisal ID
      const postId = await sheetsService.getWordPressPostIdFromAppraisalId(id);
      
      if (!postId) {
        return res.status(404).json({
          success: false,
          message: 'Appraisal not found.'
        });
      }
      
      // Process the specific step based on stepName
      let result;
      
      switch (stepName) {
        case 'enhance_description':
          result = await appraisalService.enhanceDescription(id, postId);
          break;
        case 'update_wordpress':
          result = await appraisalService.updateWordPress(id, postId);
          break;
        case 'generate_html':
          result = await appraisalService.generateHtmlContent(id, postId);
          break;
        case 'generate_pdf':
          result = await appraisalService.generatePDF(id, postId);
          break;
        case 'regenerate_statistics':
          result = await appraisalService.regenerateStatistics(id, postId);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: `Unknown step: ${stepName}`
          });
      }
      
      // Log the reprocessing action in WordPress metadata
      const timestamp = new Date().toISOString();
      await wordpressService.updateStepProcessingHistory(postId, stepName, {
        timestamp,
        user: req.user?.name || 'Unknown User',
        status: 'completed'
      });
      
      return res.json({
        success: true,
        message: `Successfully reprocessed step: ${stepName}`,
        result
      });
    } catch (error) {
      console.error(`Error reprocessing step ${stepName}:`, error);
      return res.status(500).json({
        success: false,
        message: `Error reprocessing step: ${stepName}`,
        error: error.message
      });
    }
  }
}

module.exports = AppraisalDetailsController;