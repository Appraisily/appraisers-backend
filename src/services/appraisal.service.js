const { 
  sheetsService, 
  wordpressService,
  pubsubService,
  emailService,
  openaiService 
} = require('../../services');
const { config } = require('../../config');
const fetch = require('node-fetch');

class AppraisalService {
  // ... other methods ...

  async buildPdf(id) {
    try {
      console.log('🔄 Starting PDF build process for appraisal:', id);

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

      // First complete the appraisal report
      console.log('🔄 Completing appraisal report for post:', postId);
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

      console.log('✓ Appraisal report completed successfully');

      // Get session_ID from WordPress
      const wpData = await wordpressService.getPost(postId);
      const session_ID = wpData.acf?.session_id;
      if (!session_ID) {
        throw new Error('session_ID not found');
      }

      // Generate PDF
      console.log('🔄 Generating PDF documents');
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

      console.log('✓ PDF generated successfully');
      console.log('PDF Link:', pdfData.pdfLink);
      console.log('Doc Link:', pdfData.docLink);

      // Update sheets with links
      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!M${id}:N${id}`,
        [[pdfData.pdfLink, pdfData.docLink]]
      );

      console.log('✓ Document links updated in sheets');
      return { 
        pdfLink: pdfData.pdfLink, 
        docLink: pdfData.docLink 
      };
    } catch (error) {
      console.error('❌ Error in buildPdf:', error);
      throw error;
    }
  }

  // ... other methods ...
}

module.exports = new AppraisalService();