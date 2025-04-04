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
      
      // Log all available sheets in the spreadsheet for debugging
      this.listAvailableSheets();
    } catch (error) {
      console.error('Error initializing sheets service:', error);
      throw new Error('Failed to initialize Google Sheets service');
    }
  }
  
  /**
   * List all available sheets in the spreadsheet (for debugging)
   */
  async listAvailableSheets() {
    try {
      // Get list of sheets from spreadsheet
      const sheetsResponse = await this.sheets.spreadsheets.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID
      });
      
      const allSheets = sheetsResponse.data.sheets.map(sheet => sheet.properties.title);
      console.log('📋 AVAILABLE SHEETS:', allSheets.join(', '));
      
      // Verify configured sheet names
      console.log(`🔍 Configured pending sheet: "${config.GOOGLE_SHEET_NAME}"`);
      console.log(`🔍 Configured completed sheet: "${config.COMPLETED_SHEET_NAME}"`);
      
      if (!allSheets.includes(config.GOOGLE_SHEET_NAME)) {
        console.warn(`⚠️ WARNING: Configured pending sheet "${config.GOOGLE_SHEET_NAME}" does not exist in spreadsheet!`);
      }
      
      if (!allSheets.includes(config.COMPLETED_SHEET_NAME)) {
        console.warn(`⚠️ WARNING: Configured completed sheet "${config.COMPLETED_SHEET_NAME}" does not exist in spreadsheet!`);
      }
    } catch (error) {
      console.error('Error listing available sheets:', error.message);
    }
  }

  /**
   * Escape a sheet name for use in Google Sheets API
   * @param {string} sheetName - Name of the sheet
   * @returns {string} - Escaped sheet name (with single quotes if needed)
   */
  escapeSheetName(sheetName) {
    // If the sheet name contains spaces or special characters, wrap it in single quotes
    if (/[^A-Za-z0-9]/.test(sheetName)) {
      return `'${sheetName.replace(/'/g, "''")}'`;
    }
    return sheetName;
  }

  /**
   * Create a properly formatted range string for Google Sheets API
   * @param {string} sheetName - Name of the sheet
   * @param {string} cellRange - Cell range (e.g., "A1:G10")
   * @returns {string} - Properly formatted range
   */
  formatRange(sheetName, cellRange) {
    const escapedSheetName = this.escapeSheetName(sheetName);
    return `${escapedSheetName}!${cellRange}`;
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
      throw new Error(`Failed to get values from Google Sheets: ${error.message}`);
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
    const cellRange = `A${id}:N${id}`;
    const formattedRange = this.formatRange(sheetName, cellRange);
    const values = await this.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      formattedRange
    );
    return values[0];
  }

  async updateAppraisalValue(id, value, description, sheetName = config.GOOGLE_SHEET_NAME) {
    const cellRange = `J${id}:K${id}`;
    const formattedRange = this.formatRange(sheetName, cellRange);
    await this.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      formattedRange,
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
      const cellRange = `A${appraisalId}:G${appraisalId}`;
      const formattedRange = this.formatRange(config.GOOGLE_SHEET_NAME, cellRange);
      console.log(`🔍 Checking pending range: ${formattedRange}`);
      
      const values = await this.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        formattedRange
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
      
      try {
        // First get all sheet names to verify the completed sheet exists
        const sheetsResponse = await this.sheets.spreadsheets.get({
          spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        });
        
        const allSheets = sheetsResponse.data.sheets.map(sheet => sheet.properties.title);
        console.log(`📋 Available sheets in spreadsheet: ${allSheets.join(', ')}`);
        
        // Check if our configured sheet name exists
        if (!allSheets.includes(config.COMPLETED_SHEET_NAME)) {
          console.error(`❌ Configured completed sheet "${config.COMPLETED_SHEET_NAME}" does not exist in spreadsheet`);
          throw new Error(`Completed sheet "${config.COMPLETED_SHEET_NAME}" not found in spreadsheet`);
        }
        
        // If we get here, the sheet exists, so try to get the data
        const cellRange = `A${appraisalId}:G${appraisalId}`;
        const completedRange = this.formatRange(config.COMPLETED_SHEET_NAME, cellRange);
        console.log(`🔍 Checking completed range: ${completedRange}`);
        
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
      } catch (error) {
        console.error(`❌ Error accessing completed sheet for appraisal ID ${appraisalId}:`, error.message);
        throw error; // Propagate the error rather than trying fallbacks
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
      const sheetName = config.COMPLETED_SHEET_NAME;
      console.log(`🔍 Looking for completed appraisal ${id} in sheet "${sheetName}"`);
      
      // First verify the sheet exists
      const sheetsResponse = await this.sheets.spreadsheets.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      });
      
      const allSheets = sheetsResponse.data.sheets.map(sheet => sheet.properties.title);
      console.log(`📋 Available sheets in spreadsheet: ${allSheets.join(', ')}`);
      
      // Check if our configured sheet name exists
      if (!allSheets.includes(sheetName)) {
        console.error(`❌ Configured completed sheet "${sheetName}" does not exist in spreadsheet`);
        throw new Error(`Completed sheet "${sheetName}" not found in spreadsheet`);
      }
      
      // If we get here, the sheet exists, so try to get the data
      const cellRange = `A${id}:N${id}`;
      const formattedRange = this.formatRange(sheetName, cellRange);
      console.log(`🔍 Checking range: ${formattedRange}`);
      
      const values = await this.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        formattedRange
      );

      if (values && values.length > 0) {
        return this._parseCompletedAppraisalRow(id, values[0]);
      }
      
      // No data found in the sheet
      console.warn(`⚠️ Completed appraisal ${id} not found in sheet "${sheetName}"`);
      return null;
    } catch (error) {
      console.error(`❌ Error getting completed appraisal by ID ${id}:`, error);
      throw error; // Propagate the error rather than hiding it
    }
  }
  
  /**
   * Helper method to parse a row from the completed appraisals sheet
   * @private
   */
  _parseCompletedAppraisalRow(id, row) {
    if (!row) return null;
    
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
  }

  /**
   * Update the merged description in Google Sheets
   * @param {string} id - The appraisal ID
   * @param {string} mergedDescription - The merged description
   * @returns {Promise<boolean>} - Success status
   */
  async updateMergedDescription(id, mergedDescription) {
    try {
      const cellRange = `L${id}`;
      const formattedRange = this.formatRange(config.GOOGLE_SHEET_NAME, cellRange);
      await this.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        formattedRange,
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
      const cellRange = `M${id}`;
      const formattedRange = this.formatRange(config.GOOGLE_SHEET_NAME, cellRange);
      await this.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        formattedRange,
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