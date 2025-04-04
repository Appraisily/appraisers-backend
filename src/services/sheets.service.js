const { google } = require('googleapis');
const { config } = require('../config');
const { getSecret } = require('../utils/secretManager');

class SheetsService {
  constructor() {
    this.sheets = null;
  }

  async initialize() {
    if (this.sheets) return;

    try {
      const serviceAccount = await getSecret('service-account-json');
      const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(serviceAccount),
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });
    } catch (error) {
      console.error('Error initializing sheets service:', error);
      throw new Error('Failed to initialize Google Sheets service');
    }
  }

  async getValues(spreadsheetId, range) {
    await this.initialize();

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        valueRenderOption: 'UNFORMATTED_VALUE',
        dateTimeRenderOption: 'FORMATTED_STRING'
      });

      return response.data.values || [];
    } catch (error) {
      console.error('Error getting values from sheets:', error);
      throw new Error('Failed to get values from Google Sheets');
    }
  }

  async updateValues(spreadsheetId, range, values) {
    await this.initialize();

    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        resource: { values }
      });
    } catch (error) {
      console.error('Error updating values in sheets:', error);
      throw new Error('Failed to update values in Google Sheets');
    }
  }

  async getAppraisalRow(id, sheetName = config.GOOGLE_SHEET_NAME) {
    const values = await this.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${sheetName}!A${id}:N${id}`
    );
    return values[0];
  }

  async updateAppraisalValue(id, value, description, sheetName = config.GOOGLE_SHEET_NAME) {
    await this.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${sheetName}!J${id}:K${id}`,
      [[value, description]]
    );
  }

  /**
   * Get the WordPress post ID from an appraisal ID by looking it up in Google Sheets
   * @param {string} appraisalId - The appraisal ID to look up
   * @returns {Promise<string|null>} - WordPress post ID or null if not found
   */
  async getWordPressPostIdFromAppraisalId(appraisalId) {
    try {
      console.log(`🔄 Getting WordPress post ID for appraisal ID: ${appraisalId}`);

      // First try to get from the pending sheet
      const range = `${config.GOOGLE_SHEET_NAME}!A${appraisalId}:G${appraisalId}`;
      const values = await this.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range
      );

      if (values && values.length > 0 && values[0].length >= 7) {
        const wordpressUrl = values[0][6];
        if (wordpressUrl) {
          try {
            const url = new URL(wordpressUrl);
            const postId = url.searchParams.get('post');
            if (postId) {
              console.log(`✅ Found WordPress post ID ${postId} for appraisal ID ${appraisalId}`);
              return postId;
            }
          } catch (urlError) {
            console.warn(`⚠️ Invalid WordPress URL for appraisal ID ${appraisalId}:`, wordpressUrl);
          }
        }
      }

      // If not found in pending, try the completed sheet
      console.log(`🔄 Checking completed sheet for appraisal ID: ${appraisalId}`);
      const completedRange = `${config.COMPLETED_SHEET_NAME || 'Completed'}!A${appraisalId}:G${appraisalId}`;
      const completedValues = await this.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        completedRange
      );

      if (completedValues && completedValues.length > 0 && completedValues[0].length >= 7) {
        const wordpressUrl = completedValues[0][6];
        if (wordpressUrl) {
          try {
            const url = new URL(wordpressUrl);
            const postId = url.searchParams.get('post');
            if (postId) {
              console.log(`✅ Found WordPress post ID ${postId} for completed appraisal ID ${appraisalId}`);
              return postId;
            }
          } catch (urlError) {
            console.warn(`⚠️ Invalid WordPress URL for completed appraisal ID ${appraisalId}:`, wordpressUrl);
          }
        }
      }

      console.warn(`⚠️ No WordPress post ID found for appraisal ID ${appraisalId}`);
      return null;
    } catch (error) {
      console.error('Error getting WordPress post ID from appraisal ID:', error);
      throw new Error(`Failed to get WordPress post ID: ${error.message}`);
    }
  }

  /**
   * Get a pending appraisal by ID
   * @param {string} id - The appraisal ID
   * @returns {Promise<object|null>} - Appraisal data or null if not found
   */
  async getPendingAppraisalById(id) {
    try {
      const range = `${config.GOOGLE_SHEET_NAME}!A${id}:N${id}`;
      const values = await this.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range
      );

      if (!values || values.length === 0) {
        return null;
      }

      const row = values[0];
      const wordpressUrl = row[6] || '';
      let wordpressPostId = null;

      try {
        const url = new URL(wordpressUrl);
        wordpressPostId = url.searchParams.get('post');
      } catch (error) {
        // Invalid URL, ignore
      }

      return {
        id,
        date: row[0] || '',
        appraisalType: row[1] || '',
        identifier: row[2] || '',
        customerEmail: row[3] || '',
        customerName: row[4] || '',
        status: row[5] || '',
        wordpressUrl,
        wordpressPostId,
        iaDescription: row[7] || '',
        customerDescription: row[8] || '',
        value: row[9] || '',
        appraisersDescription: row[10] || ''
      };
    } catch (error) {
      console.error(`Error getting pending appraisal by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get a completed appraisal by ID
   * @param {string} id - The appraisal ID
   * @returns {Promise<object|null>} - Appraisal data or null if not found
   */
  async getCompletedAppraisalById(id) {
    try {
      const range = `${config.COMPLETED_SHEET_NAME || 'Completed'}!A${id}:N${id}`;
      const values = await this.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range
      );

      if (!values || values.length === 0) {
        return null;
      }

      const row = values[0];
      const wordpressUrl = row[6] || '';
      let wordpressPostId = null;

      try {
        const url = new URL(wordpressUrl);
        wordpressPostId = url.searchParams.get('post');
      } catch (error) {
        // Invalid URL, ignore
      }

      return {
        id,
        date: row[0] || '',
        appraisalType: row[1] || '',
        identifier: row[2] || '',
        customerEmail: row[3] || '',
        customerName: row[4] || '',
        status: row[5] || '',
        wordpressUrl,
        wordpressPostId,
        iaDescription: row[7] || '',
        customerDescription: row[8] || '',
        value: row[9] || '',
        appraisersDescription: row[10] || '',
        pdfLink: row[11] || '',
        docLink: row[12] || ''
      };
    } catch (error) {
      console.error(`Error getting completed appraisal by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Update the merged description in Google Sheets
   * @param {string} id - The appraisal ID
   * @param {string} mergedDescription - The merged description
   * @returns {Promise<boolean>} - Success status
   */
  async updateMergedDescription(id, mergedDescription) {
    try {
      await this.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!L${id}`,
        [[mergedDescription]]
      );
      return true;
    } catch (error) {
      console.error(`Error updating merged description for appraisal ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update the PDF URL in Google Sheets
   * @param {string} id - The appraisal ID
   * @param {string} pdfUrl - The PDF URL
   * @returns {Promise<boolean>} - Success status
   */
  async updatePdfUrl(id, pdfUrl) {
    try {
      await this.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!M${id}`,
        [[pdfUrl]]
      );
      return true;
    } catch (error) {
      console.error(`Error updating PDF URL for appraisal ID ${id}:`, error);
      throw error;
    }
  }
}

module.exports = new SheetsService();