const { google } = require('googleapis');
const { config } = require('../config');
const { getSecret } = require('../utils/secretManager');

class SheetsService {
  constructor() {
    this.sheets = null;
  }

  async initialize() {
    try {
      // Get service account credentials from the correct secret
      const serviceAccountJson = await getSecret('service-account-json');
      if (!serviceAccountJson) {
        throw new Error('Service account credentials not found');
      }

      // Parse credentials
      const credentials = JSON.parse(serviceAccountJson);
      
      // Validate required fields
      const requiredFields = ['private_key', 'client_email', 'project_id'];
      for (const field of requiredFields) {
        if (!credentials[field]) {
          throw new Error(`Missing required field in service account: ${field}`);
        }
      }

      // Create auth client
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      // Get client
      const client = await auth.getClient();
      
      // Create sheets instance
      this.sheets = google.sheets({ 
        version: 'v4', 
        auth: client
      });

      console.log('✓ Authenticated with Google Sheets API');
      
      // Test connection
      const test = await this.sheets.spreadsheets.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        fields: 'spreadsheetId'
      });

      if (!test.data.spreadsheetId) {
        throw new Error('Failed to access spreadsheet');
      }
      
      console.log('✓ Successfully connected to Google Sheets');
      return true;
    } catch (error) {
      // Add more context to the error
      if (error.response?.data?.error) {
        const { message, status } = error.response.data.error;
        throw new Error(`Google Sheets API error (${status}): ${message}`);
      }
      throw error;
    }
  }

  async getValues(spreadsheetId, range) {
    if (!this.sheets) {
      await this.initialize();
    }
    
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
    if (!this.sheets) {
      await this.initialize();
    }

    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        resource: { values },
      });
    } catch (error) {
      console.error('Error updating values in sheets:', error);
      throw new Error(`Failed to update sheet values: ${error.message}`);
    }
  }
}

module.exports = new SheetsService();