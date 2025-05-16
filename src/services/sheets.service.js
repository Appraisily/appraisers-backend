const { google } = require('googleapis');
const { config } = require('../config');
const { getSecret } = require('./secretManager');

/**
 * Service for interacting with Google Sheets
 */
class SheetsService {
  constructor() {
    this.sheets = null;
  }

  /**
   * Initialize the Google Sheets service with authentication
   */
  async initialize() {
    if (this.sheets) return;

    try {
      const serviceAccount = await getSecret('service-account-json');
      const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(serviceAccount),
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      const authClient = await auth.getClient();
      this.sheets = google.sheets({ version: 'v4', auth: authClient });
      
      // Log all available sheets in the spreadsheet for debugging
      this.listAvailableSheets();
    } catch (error) {
      console.error('Error initializing sheets service:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to initialize Google Sheets service');
    }
  }
  
  /**
   * List all available sheets in the spreadsheet (for debugging)
   */
  async listAvailableSheets() {
    try {
      if (!this.sheets) {
        console.warn('Sheets API not initialized yet');
        return;
      }

      // Get list of sheets from spreadsheet
      const sheetsResponse = await this.sheets.spreadsheets.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID || ''
      });
      
      if (!sheetsResponse.data.sheets) {
        console.warn('No sheets found in the spreadsheet');
        return;
      }

      const allSheets = sheetsResponse.data.sheets
        .filter(sheet => sheet.properties && sheet.properties.title)
        .map(sheet => sheet.properties.title);

      console.log('📋 AVAILABLE SHEETS:', allSheets.join(', '));
      
      // Verify configured sheet names
      console.log(`🔍 Configured pending sheet: "${config.GOOGLE_SHEET_NAME || 'undefined'}"`);
      console.log(`🔍 Configured completed sheet: "${config.COMPLETED_SHEET_NAME || 'undefined'}"`);
      
      if (config.GOOGLE_SHEET_NAME && !allSheets.includes(config.GOOGLE_SHEET_NAME)) {
        console.warn(`⚠️ WARNING: Configured pending sheet "${config.GOOGLE_SHEET_NAME}" does not exist in spreadsheet!`);
      }
      
      if (config.COMPLETED_SHEET_NAME && !allSheets.includes(config.COMPLETED_SHEET_NAME)) {
        console.warn(`⚠️ WARNING: Configured completed sheet "${config.COMPLETED_SHEET_NAME}" does not exist in spreadsheet!`);
      }
    } catch (error) {
      console.error('Error listing available sheets:', error instanceof Error ? error.message : String(error));
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

  /**
   * Get values from a Google Sheet
   * @param {string} spreadsheetId - ID of the spreadsheet
   * @param {string} range - Range to read
   * @returns {Promise<any[][]>} - Values from the sheet
   */
  async getValues(spreadsheetId, range) {
    await this.initialize();

    try {
      if (!this.sheets) {
        throw new Error('Sheets API not initialized');
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        valueRenderOption: 'UNFORMATTED_VALUE',
        dateTimeRenderOption: 'FORMATTED_STRING'
      });

      return response.data.values || [];
    } catch (error) {
      console.error('Error getting values from sheets:', error instanceof Error ? error.message : String(error));
      throw new Error(`Failed to get values from Google Sheets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update values in a Google Sheet
   * @param {string} spreadsheetId - ID of the spreadsheet
   * @param {string} range - Range to update
   * @param {any[][]} values - Values to write
   */
  async updateValues(spreadsheetId, range, values) {
    await this.initialize();

    try {
      if (!this.sheets) {
        throw new Error('Sheets API not initialized');
      }

      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: { values }
      });
    } catch (error) {
      console.error('Error updating values in sheets:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to update values in Google Sheets');
    }
  }

  /**
   * Get a row of data for an appraisal by ID
   * @param {string|number} id - The appraisal ID
   * @param {string} [sheetName] - Sheet name to use (defaults to pending sheet)
   * @returns {Promise<any[]>} - Row data
   */
  async getAppraisalRow(id, sheetName = config.GOOGLE_SHEET_NAME || 'Pending') {
    const cellRange = `A${id}:N${id}`;
    const formattedRange = this.formatRange(sheetName, cellRange);
    const values = await this.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID || '',
      formattedRange
    );
    return values[0];
  }

  /**
   * Update the appraisal value and description
   * @param {string|number} id - The appraisal ID
   * @param {string|number} value - The appraisal value
   * @param {string} description - The appraisal description
   * @param {string} [sheetName] - Sheet name to use (defaults to pending sheet)
   */
  async updateAppraisalValue(id, value, description, sheetName = config.GOOGLE_SHEET_NAME || 'Pending') {
    const cellRange = `J${id}:K${id}`;
    const formattedRange = this.formatRange(sheetName, cellRange);
    await this.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID || '',
      formattedRange,
      [[value, description]]
    );
  }

  /**
   * Get the WordPress post ID from an appraisal ID by looking it up in Google Sheets
   * @param {string|number} appraisalId - The appraisal ID to look up
   * @returns {Promise<string|null>} - WordPress post ID or null if not found
   */
  async getWordPressPostIdFromAppraisalId(appraisalId) {
    try {
      console.log(`🔄 Getting WordPress post ID for appraisal ID: ${appraisalId}`);

      // First try to get from the pending sheet
      const cellRange = `A${appraisalId}:G${appraisalId}`;
      const formattedRange = this.formatRange(config.GOOGLE_SHEET_NAME || 'Pending', cellRange);
      console.log(`🔍 Checking pending range: ${formattedRange}`);
      
      const values = await this.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID || '',
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
        if (!this.sheets) {
          throw new Error('Sheets API not initialized');
        }

        // First get all sheet names to verify the completed sheet exists
        const sheetsResponse = await this.sheets.spreadsheets.get({
          spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID || '',
        });
        
        if (!sheetsResponse.data.sheets) {
          throw new Error('No sheets found in the spreadsheet');
        }

        const allSheets = sheetsResponse.data.sheets
          .filter(sheet => sheet.properties && sheet.properties.title)
          .map(sheet => sheet.properties.title);
        
        console.log(`📋 Available sheets in spreadsheet: ${allSheets.join(', ')}`);
        
        // Check if our configured sheet name exists
        const completedSheetName = config.COMPLETED_SHEET_NAME || 'Completed';
        if (!allSheets.includes(completedSheetName)) {
          console.error(`❌ Configured completed sheet "${completedSheetName}" does not exist in spreadsheet`);
          throw new Error(`Completed sheet "${completedSheetName}" not found in spreadsheet`);
        }
        
        // If we get here, the sheet exists, so try to get the data
        const cellRange = `A${appraisalId}:G${appraisalId}`;
        const completedRange = this.formatRange(completedSheetName, cellRange);
        console.log(`🔍 Checking completed range: ${completedRange}`);
        
        const completedValues = await this.getValues(
          config.PENDING_APPRAISALS_SPREADSHEET_ID || '',
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
        console.error(`❌ Error accessing completed sheet for appraisal ID ${appraisalId}:`, 
          error instanceof Error ? error.message : String(error));
        throw error; // Propagate the error rather than trying fallbacks
      }

      console.warn(`⚠️ No WordPress post ID found for appraisal ID ${appraisalId}`);
      return null;
    } catch (error) {
      console.error('Error getting WordPress post ID from appraisal ID:', 
        error instanceof Error ? error.message : String(error));
      throw new Error(`Failed to get WordPress post ID: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get a pending appraisal by ID
   * @param {string|number} id - The appraisal ID
   * @returns {Promise<object|null>} - Appraisal data or null if not found
   */
  async getPendingAppraisalById(id) {
    try {
      const range = `${config.GOOGLE_SHEET_NAME || 'Pending'}!A${id}:N${id}`;
      const values = await this.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID || '',
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
   * @param {string|number} id - The appraisal ID
   * @returns {Promise<object|null>} - Appraisal data or null if not found
   */
  async getCompletedAppraisalById(id) {
    try {
      const sheetName = config.COMPLETED_SHEET_NAME || 'Completed';
      console.log(`🔍 Looking for completed appraisal ${id} in sheet "${sheetName}"`);
      
      // First verify the sheet exists
      if (!this.sheets) {
        throw new Error('Sheets API not initialized');
      }

      const sheetsResponse = await this.sheets.spreadsheets.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID || '',
      });
      
      if (!sheetsResponse.data.sheets) {
        throw new Error('No sheets found in the spreadsheet');
      }

      const allSheets = sheetsResponse.data.sheets
        .filter(sheet => sheet.properties && sheet.properties.title)
        .map(sheet => sheet.properties.title);
      
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
        config.PENDING_APPRAISALS_SPREADSHEET_ID || '',
        formattedRange
      );

      if (values && values.length > 0) {
        return this._parseCompletedAppraisalRow(id, values[0]);
      }
      
      // No data found in the sheet
      console.warn(`⚠️ Completed appraisal ${id} not found in sheet "${sheetName}"`);
      return null;
    } catch (error) {
      console.error(`❌ Error getting completed appraisal by ID ${id}:`, 
        error instanceof Error ? error.message : String(error));
      throw error; // Propagate the error rather than hiding it
    }
  }
  
  /**
   * Helper method to parse a row from the completed appraisals sheet
   * @private
   * @param {string|number} id - The appraisal ID
   * @param {any[]} row - The row data
   * @returns {object|null} - Parsed appraisal data
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
   * @param {string|number} id - The appraisal ID
   * @param {string} mergedDescription - The merged description
   * @returns {Promise<boolean>} - Success status
   */
  async updateMergedDescription(id, mergedDescription) {
    try {
      const cellRange = `L${id}`;
      const formattedRange = this.formatRange(config.GOOGLE_SHEET_NAME || 'Pending', cellRange);
      await this.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID || '',
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
   * @param {string|number} id - The appraisal ID
   * @param {string} pdfUrl - The PDF URL
   * @returns {Promise<boolean>} - Success status
   */
  async updatePdfUrl(id, pdfUrl) {
    try {
      const cellRange = `M${id}`;
      const formattedRange = this.formatRange(config.GOOGLE_SHEET_NAME || 'Pending', cellRange);
      await this.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID || '',
        formattedRange,
        [[pdfUrl]]
      );
      return true;
    } catch (error) {
      console.error(`Error updating PDF URL for appraisal ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update the processing status of an appraisal in Google Sheets
   * @param {string|number} id - The appraisal ID
   * @param {string} status - The processing status message
   * @returns {Promise<boolean>} - Success status
   */
  async updateProcessingStatus(id, status) {
    try {
      console.log(`🔄 Updating processing status for appraisal ID ${id}: "${status}"`);
      
      // First determine if this is a pending or completed appraisal to use the right sheet
      let sheetName = config.GOOGLE_SHEET_NAME || 'Pending'; // Default to pending sheet
      
      try {
        // Check status in pending sheet first
        const statusRange = `F${id}`;
        const formattedStatusRange = this.formatRange(config.GOOGLE_SHEET_NAME || 'Pending', statusRange);
        
        const statusValues = await this.getValues(
          config.PENDING_APPRAISALS_SPREADSHEET_ID || '',
          formattedStatusRange
        );
        
        // If we get a value and it's "Completed", use the completed sheet
        if (statusValues && statusValues.length > 0 && statusValues[0][0] === "Completed") {
          sheetName = config.COMPLETED_SHEET_NAME || 'Completed';
          console.log(`🔍 Appraisal ${id} is marked as completed, using sheet "${sheetName}"`);
        } else {
          console.log(`🔍 Appraisal ${id} is not completed, using pending sheet "${sheetName}"`);
        }
      } catch (checkError) {
        // If we can't determine status, default to pending sheet
        console.warn(`⚠️ Could not determine completion status for appraisal ${id}: ${
          checkError instanceof Error ? checkError.message : String(checkError)}`);
        console.log(`🔍 Defaulting to pending sheet "${sheetName}"`);
      }
      
      // Add timestamp to the status
      const timestamp = new Date().toISOString();
      const statusWithTimestamp = `${status} (${timestamp})`;
      
      // Status will be stored in column O (15th column)
      const cellRange = `O${id}`;
      const formattedRange = this.formatRange(sheetName, cellRange);
      
      console.log(`📝 Writing status to ${formattedRange}: "${statusWithTimestamp}"`);
      
      await this.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID || '',
        formattedRange,
        [[statusWithTimestamp]]
      );
      
      console.log(`✅ Successfully updated processing status for appraisal ID ${id}`);
      return true;
    } catch (error) {
      console.error(`❌ Error updating processing status for appraisal ID ${id}:`, error);
      
      // Don't rethrow the error to avoid breaking the main process flow
      // Return false to indicate failure instead
      return false;
    }
  }

  /**
   * Add a new pending appraisal to the Google Sheets
   * @param {Object} appraisalData - Data for the new appraisal
   * @returns {Promise<string|number>} - The ID (row number) of the new appraisal
   */
  async addPendingAppraisal(appraisalData) {
    await this.initialize();
    
    try {
      console.log('🔄 Adding new pending appraisal to Google Sheets:', JSON.stringify(appraisalData).substring(0, 100) + '...');
      
      if (!this.sheets) {
        throw new Error('Sheets API not initialized');
      }
      
      // Get the pending sheet name
      const sheetName = config.GOOGLE_SHEET_NAME || 'Pending';
      
      // First, find the next available row - get the whole first column
      console.log(`🔍 Looking for next available row in sheet "${sheetName}"`);
      const range = this.formatRange(sheetName, 'A:A');
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID || '',
        range,
        valueRenderOption: 'UNFORMATTED_VALUE'
      });
      
      const values = response.data.values || [];
      const nextRow = values.length + 1; // Add 1 since rows are 1-indexed
      
      console.log(`📋 Next available row: ${nextRow}`);
      
      // Prepare the row data
      const rowData = [
        appraisalData.date || new Date().toLocaleDateString('en-US'),
        appraisalData.appraisalType || 'Regular',
        appraisalData.identifier || '',
        appraisalData.customerEmail || '',
        appraisalData.customerName || '',
        appraisalData.status || 'Pending',
        appraisalData.wordpressUrl || '',
        appraisalData.iaDescription || '',
        appraisalData.customerDescription || '',
        appraisalData.value || '',
        appraisalData.appraisersDescription || ''
      ];
      
      // Calculate the range to update
      const updateRange = this.formatRange(sheetName, `A${nextRow}:K${nextRow}`);
      
      // Update the sheet
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID || '',
        range: updateRange,
        valueInputOption: 'RAW',
        requestBody: {
          values: [rowData]
        }
      });
      
      console.log(`✅ Successfully added new appraisal to row ${nextRow}`);
      return nextRow;
    } catch (error) {
      console.error('❌ Error adding pending appraisal:', error);
      throw new Error(`Failed to add pending appraisal: ${error.message}`);
    }
  }
}

module.exports = new SheetsService();