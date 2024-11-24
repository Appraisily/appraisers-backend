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
}

module.exports = new SheetsService();