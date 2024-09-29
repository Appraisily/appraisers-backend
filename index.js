const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Load service account credentials
const SERVICE_ACCOUNT_FILE = path.join(__dirname, 'service-account.json');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Authenticate with Google Sheets API
const auth = new google.auth.GoogleAuth({
  keyFile: SERVICE_ACCOUNT_FILE,
  scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth });

// Replace with your Google Sheet ID
const SPREADSHEET_ID = '1PDdt-tEV78uMGW-813UTcVxC9uzrRXQSmNLCI1rR-xc';
const SHEET_NAME = 'Pending Appraisals';

// **Endpoint: Get Pending Appraisals**
app.get('/api/appraisals', async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:I`, // Assuming row 1 has headers
    });

    const rows = response.data.values || [];
    // Map rows to objects
    const appraisals = rows.map((row, index) => ({
      id: index + 2, // Row number in the sheet
      date: row[0] || '',
      appraisalType: row[1] || '',
      identifier: row[2] || '',
      email: row[3] || '',
      category: row[4] || '',
      status: row[5] || '',
      url: row[6] || '',
      currentDescription: row[7] || '',
      humanDescription: row[8] || '',
    }));

    res.json(appraisals);
  } catch (error) {
    console.error('Error fetching appraisals:', error);
    res.status(500).send('Error fetching appraisals');
  }
});

// **Endpoint: Update Appraisal**
app.post('/api/appraisals/:id', async (req, res) => {
  const { id } = req.params; // Row number
  const { appraisalValue, humanDescription } = req.body;

  try {
    // Update columns I (Human Description) and J (Appraisal Value)
    const updateRange = `${SHEET_NAME}!I${id}:J${id}`;
    const values = [[humanDescription, appraisalValue]];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: updateRange,
      valueInputOption: 'RAW',
      resource: {
        values: values,
      },
    });

    res.send('Appraisal updated successfully');
  } catch (error) {
    console.error('Error updating appraisal:', error);
    res.status(500).send('Error updating appraisal');
  }
});

// **Start the Server**
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
