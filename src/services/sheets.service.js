const { google } = require('googleapis');
const { getSecret } = require('../utils/secretManager');

class SheetsService {
  constructor() {
    this.sheets = null;
  }

  async initialize() {
    try {
      // Get service account credentials from Secret Manager
      const credentials = await getSecret('GOOGLE_DOCS_CREDENTIALS');
      
      // Create auth client from credentials
      const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(credentials),
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      console.log('✓ Authenticated with Google Sheets API');
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