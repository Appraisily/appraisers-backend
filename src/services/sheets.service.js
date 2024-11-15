const { google } = require('googleapis');
const { config } = require('../config');

class SheetsService {
  constructor() {
    this.sheets = null;
  }

  async initialize() {
    try {
      if (!config.GOOGLE_DOCS_CREDENTIALS) {
        throw new Error('Google service account credentials not found');
      }

      // Parse credentials
      const credentials = JSON.parse(config.GOOGLE_DOCS_CREDENTIALS);
      
      // Validate required fields
      const requiredFields = ['private_key', 'client_email', 'project_id'];
      for (const field of requiredFields) {
        if (!credentials[field]) {
          throw new Error(`Missing required field in credentials: ${field}`);
        }
      }

      // Create auth client
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      console.log('✓ Authenticated with Google Sheets API');
      
      // Test connection
      await this.sheets.spreadsheets.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID
      });
      
      console.log('✓ Successfully connected to Google Sheets');
      return true;
    } catch (error) {
      console.error('Error authenticating with Google Sheets API:', error);
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
      });

      return response.data.values || [];
    } catch (error) {
      console.error('Error getting values from sheets:', error);
      throw error;
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
      throw error;
    }
  }
}

module.exports = new SheetsService();