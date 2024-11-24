const { google } = require('googleapis');
const { config } = require('../config');
const { getSecret } = require('../utils/secretManager');

class SheetsService {
  constructor() {
    this.sheets = null;
  }

  async initialize() {
    if (this.sheets) return;

    const serviceAccount = await getSecret('service-account-json');
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(serviceAccount),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    this.sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });
  }

  async getAppraisalRow(id, sheetName = config.GOOGLE_SHEET_NAME) {
    await this.initialize();
    
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: `${sheetName}!A${id}:N${id}`
    });

    return response.data.values?.[0];
  }

  async updateAppraisalValue(id, value, description, sheetName = config.GOOGLE_SHEET_NAME) {
    await this.initialize();

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: `${sheetName}!J${id}:K${id}`,
      valueInputOption: 'RAW',
      resource: {
        values: [[value, description]]
      }
    });
  }
}

module.exports = new SheetsService();