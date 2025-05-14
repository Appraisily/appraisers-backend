const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { createLogger } = require('../utils/logger');
const secretManager = require('../utils/secrets');

/**
 * Service for converting Markdown to Google Docs and PDF
 */
class GoogleDocsService {
  constructor() {
    this.logger = createLogger('GoogleDocsService');
    this.authClient = null;
    this.drive = null;
  }

  /**
   * Initialize the Google Docs service
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.logger.info('Initializing Google Docs service...');
      
      // Get Google credentials from Secret Manager
      const serviceAccountKey = await secretManager.getSecret('GOOGLE_SERVICE_ACCOUNT_KEY');
      
      if (!serviceAccountKey) {
        throw new Error('Missing Google service account key in Secret Manager');
      }

      // Parse the service account key
      const credentials = JSON.parse(serviceAccountKey);
      
      // Create JWT client
      this.authClient = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        ['https://www.googleapis.com/auth/drive']
      );

      // Create Drive API client
      this.drive = google.drive({ version: 'v3', auth: this.authClient });
      
      this.logger.info('Google Docs service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Google Docs service:', error);
      throw error;
    }
  }

  /**
   * Convert markdown to Google Doc and optionally to PDF
   * @param {string} markdownContent - The markdown content
   * @param {Object} options - Options for conversion
   * @returns {Promise<Object>} - The result with docUrl and optional fileContent
   */
  async markdownToGoogleDoc(markdownContent, options = {}) {
    try {
      if (!this.authClient || !this.drive) {
        await this.initialize();
      }
      
      // Default options
      const defaultOptions = {
        filename: `Appraisal-${Date.now()}`,
        convertToPdf: false,
        folderId: null // Optional folder ID to upload to
      };
      
      const mergedOptions = { ...defaultOptions, ...options };
      
      // Prepare request body
      const requestBody = {
        name: mergedOptions.filename,
        mimeType: 'application/vnd.google-apps.document'
      };
      
      // If folder ID is provided, set parent
      if (mergedOptions.folderId) {
        requestBody.parents = [mergedOptions.folderId];
      }
      
      // Upload the file initially as plain text
      const uploadResponse = await this.drive.files.create({
        requestBody: {
          name: mergedOptions.filename + '.md', 
          mimeType: 'text/markdown'
        },
        media: {
          mimeType: 'text/markdown',
          body: markdownContent
        },
        fields: 'id'
      });
      
      const uploadedFileId = uploadResponse.data.id;
      this.logger.info(`Markdown file uploaded with ID: ${uploadedFileId}`);
      
      // Now convert it to a Google Doc
      const copyResponse = await this.drive.files.copy({
        fileId: uploadedFileId,
        requestBody: {
          name: mergedOptions.filename,
          mimeType: 'application/vnd.google-apps.document'
        }
      });
      
      const docId = copyResponse.data.id;
      this.logger.info(`Converted to Google Doc with ID: ${docId}`);
      
      // Delete the original markdown file
      await this.drive.files.delete({
        fileId: uploadedFileId
      });
      
      // Create a shareable link
      await this.drive.permissions.create({
        fileId: docId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });
      
      // Get the web view link
      const docResponse = await this.drive.files.get({
        fileId: docId,
        fields: 'webViewLink'
      });
      
      const docUrl = docResponse.data.webViewLink;
      
      // If PDF conversion is requested
      if (mergedOptions.convertToPdf) {
        const pdfResponse = await this.drive.files.export({
          fileId: docId,
          mimeType: 'application/pdf'
        }, {
          responseType: 'arraybuffer'
        });
        
        // Return both the Doc URL and PDF content
        return {
          docId,
          docUrl,
          fileContent: Buffer.from(pdfResponse.data)
        };
      }
      
      // Return just the Doc URL if no PDF requested
      return {
        docId,
        docUrl
      };
    } catch (error) {
      this.logger.error('Error converting Markdown to Google Doc:', error);
      throw error;
    }
  }
}

module.exports = GoogleDocsService; 