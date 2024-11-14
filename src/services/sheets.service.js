const { google } = require('googleapis');
const { getSecret } = require('../utils/secretManager');

class SheetsService {
  constructor() {
    this.sheets = null;
  }

  async initialize() {
    try {
      const serviceAccount = await getSecret('service-account-json');

      const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(serviceAccount),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      console.log('Authenticated with Google Sheets API');
    } catch (error) {
      console.error('Error authenticating with Google Sheets API:', error);
      throw error;
    }
  }

  async getValues(spreadsheetId, range) {
    if (!this.sheets) await this.initialize();
    
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return response.data.values;
  }

  async updateValues(spreadsheetId, range, values) {
    if (!this.sheets) await this.initialize();

    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: { values },
    });
  }
}

module.exports = new SheetsService();