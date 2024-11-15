const { google } = require('googleapis');
const { getSecret } = require('../utils/secretManager');

class SheetsService {
  constructor() {
    this.sheets = null;
  }

  async initialize() {
    try {
      // Get service account credentials
      const serviceAccount = await getSecret('service-account-json');
      
      // Parse credentials with error handling
      let credentials;
      try {
        credentials = JSON.parse(serviceAccount);
      } catch (error) {
        console.error('Error parsing service account credentials:', error);
        if (process.env.NODE_ENV === 'development') {
          // Use mock credentials in development
          credentials = {
            "type": "service_account",
            "project_id": "mock-project",
            "private_key": "mock-key",
            "client_email": "mock@example.com"
          };
        } else {
          throw error;
        }
      }

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      console.log('✓ Authenticated with Google Sheets API');
      
      return true;
    } catch (error) {
      console.error('Error initializing Google Sheets service:', error);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Using mock Sheets service in development mode');
        this.sheets = this.getMockSheetsService();
        return true;
      }
      
      throw error;
    }
  }

  getMockSheetsService() {
    return {
      spreadsheets: {
        values: {
          get: async () => ({
            data: {
              values: [
                ['2024-01-01', 'RegularArt', 'TEST001', 'test@example.com', 'Test User', 'Pending', 'https://example.com/wp-admin/post.php?post=123', 'Test Description'],
                ['2024-01-02', 'PremiumArt', 'TEST002', 'test2@example.com', 'Test User 2', 'Pending', 'https://example.com/wp-admin/post.php?post=124', 'Test Description 2']
              ]
            }
          }),
          update: async () => ({
            data: { updatedCells: 1 }
          })
        }
      }
    };
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