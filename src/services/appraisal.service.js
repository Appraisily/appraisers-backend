const { 
  sheetsService, 
  wordpressService,
  pubsubService,
  emailService 
} = require('../../services');
const { config } = require('../../config');
const fetch = require('node-fetch');

class AppraisalService {
  async buildPdf(id) {
    try {
      // Get appraisal details
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!A${id}:G${id}`
      );

      const row = values[0];
      if (!row) {
        throw new Error('Appraisal not found');
      }

      const wordpressUrl = row[6];
      const postId = new URL(wordpressUrl).searchParams.get('post');

      if (!postId) {
        throw new Error('Invalid WordPress URL - missing post ID');
      }

      // Step 1: Complete the appraisal report
      /*
       * POST /complete-appraisal-report
       * Content-Type: application/json
       * 
       * Required parameters:
       * - postId: WordPress post ID (string)
       * 
       * This endpoint generates the complete appraisal report content
       * and must be called before generating the PDF
       */
      const completeResponse = await fetch(
        'https://appraisals-backend-856401495068.us-central1.run.app/complete-appraisal-report',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId })
        }
      );

      if (!completeResponse.ok) {
        const error = await completeResponse.text();
        throw new Error(`Failed to complete appraisal report: ${error}`);
      }

      const completeData = await completeResponse.json();
      if (!completeData.success) {
        throw new Error(completeData.message || 'Failed to complete appraisal report');
      }

      // Step 2: Get session_ID from WordPress
      const wpData = await wordpressService.getPost(postId);
      const session_ID = wpData.acf?.session_id;
      
      if (!session_ID) {
        throw new Error('session_ID not found in WordPress post');
      }

      // Step 3: Generate PDF
      /*
       * POST /generate-pdf
       * Content-Type: application/json
       * 
       * Required parameters:
       * - postId: WordPress post ID (string)
       * - session_ID: Session ID from WordPress ACF fields (string)
       * 
       * This endpoint generates both PDF and Doc versions of the appraisal
       * Returns: { pdfLink: string, docLink: string }
       */
      const pdfResponse = await fetch(
        'https://appraisals-backend-856401495068.us-central1.run.app/generate-pdf',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId, session_ID })
        }
      );

      if (!pdfResponse.ok) {
        const error = await pdfResponse.text();
        throw new Error(`Failed to generate PDF: ${error}`);
      }

      const pdfData = await pdfResponse.json();
      if (!pdfData.success) {
        throw new Error(pdfData.message || 'Failed to generate PDF');
      }

      // Step 4: Update sheets with document links
      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!M${id}:N${id}`,
        [[pdfData.pdfLink, pdfData.docLink]]
      );

      return {
        pdfLink: pdfData.pdfLink,
        docLink: pdfData.docLink
      };
    } catch (error) {
      console.error('Error in buildPdf:', error);
      throw error;
    }
  }

  // ... rest of the service methods
}

module.exports = new AppraisalService();