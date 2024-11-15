const { google } = require('googleapis');
const { config } = require('../config');
const { getSecret } = require('../utils/secretManager');

class SheetsService {
  constructor() {
    this.sheets = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      return true;
    }

    try {
      console.log('Initializing Google Sheets service...');
      
      // Get service account credentials
      const serviceAccountJson = await getSecret('service-account-json');
      if (!serviceAccountJson) {
        throw new Error('Service account credentials not found');
      }

      // Parse credentials
      const credentials = JSON.parse(serviceAccountJson);

      // Create auth client
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      // Initialize sheets client
      this.sheets = google.sheets({ version: 'v4', auth });
      
      // Test connection
      await this.sheets.spreadsheets.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        fields: 'spreadsheetId'
      });

      this.isInitialized = true;
      console.log('✓ Google Sheets service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Sheets service:', error);
      throw new Error(`Google Sheets initialization failed: ${error.message}`);
    }
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  async getValues(spreadsheetId, range) {
    await this.ensureInitialized();

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
      throw new Error(`Failed to get values from sheet: ${error.message}`);
    }
  }

  async updateValues(spreadsheetId, range, values) {
    await this.ensureInitialized();

    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        resource: { values }
      });
    } catch (error) {
      console.error('Error updating values in sheets:', error);
      throw new Error(`Failed to update sheet values: ${error.message}`);
    }
  }
}

module.exports = new SheetsService();