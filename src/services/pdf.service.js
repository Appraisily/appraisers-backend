const fetch = require('node-fetch');
const { config } = require('../config');
const { sheetsService, wordpressService } = require('../services');

class PdfService {
  constructor() {
    this.baseUrl = 'https://appraisals-backend-856401495068.us-central1.run.app';
  }

  async generatePdf(id) {
    try {
      // Get appraisal details from sheets
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

      // Get WordPress data including session_ID
      const wpData = await wordpressService.getPost(postId);
      const session_ID = wpData.acf?.session_id;
      
      if (!session_ID) {
        throw new Error('session_ID not found');
      }

      // Step 1: Complete the appraisal report
      const completeResponse = await fetch(`${this.baseUrl}/complete-appraisal-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId })
      });

      if (!completeResponse.ok) {
        const error = await completeResponse.text();
        throw new Error(`Failed to complete appraisal report: ${error}`);
      }

      const completeData = await completeResponse.json();
      if (!completeData.success) {
        throw new Error(completeData.message || 'Failed to complete appraisal report');
      }

      // Step 2: Generate PDF
      const pdfResponse = await fetch(`${this.baseUrl}/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          session_ID
        })
      });

      if (!pdfResponse.ok) {
        const error = await pdfResponse.text();
        throw new Error(`PDF generation failed: ${error}`);
      }

      const pdfData = await pdfResponse.json();
      if (!pdfData.success) {
        throw new Error(pdfData.message || 'PDF generation failed');
      }

      // Update sheets with document links
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
      console.error('Error generating PDF:', error);
      throw error;
    }
  }
}

module.exports = new PdfService();