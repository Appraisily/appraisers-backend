// controllers/appraisalsController.js

const { google } = require('googleapis');
const fetch = require('node-fetch');
const appraisalStepsModule = require('../shared/appraisalSteps');
const { initializeSheets } = require('../shared/googleSheets');
const getImageUrl = require('../utils/getImageUrl');
const { PubSub } = require('@google-cloud/pubsub');
const validateSetValueData = require('../utils/validateSetValueData');

// Add back the getAppraisals method that was accidentally removed
exports.getAppraisals = async (req, res) => {
  try {
    const { config } = require('../shared/config');
    const SPREADSHEET_ID = config.PENDING_APPRAISALS_SPREADSHEET_ID;
    const SHEET_NAME = config.GOOGLE_SHEET_NAME;

    if (!SPREADSHEET_ID || !SHEET_NAME) {
      console.error('SPREADSHEET_ID o SHEET_NAME no están definidos en config.');
      return res.status(500).json({ success: false, message: 'Error de configuración del servidor.' });
    }

    const sheets = await initializeSheets();

    console.log('SPREADSHEET_ID:', SPREADSHEET_ID);
    console.log('SHEET_NAME:', SHEET_NAME);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:H`
    });

    const rows = response.data.values || [];
    console.log(`Total de filas obtenidas: ${rows.length}`);

    const appraisals = rows.map((row, index) => ({
      id: index + 2,
      date: row[0] || '',
      appraisalType: row[1] || '',
      identifier: row[2] || '',
      status: row[5] || '',
      wordpressUrl: row[6] || '',
      iaDescription: row[7] || ''
    }));

    console.log(`Total de apreciaciones mapeadas: ${appraisals.length}`);
    res.json(appraisals);
  } catch (error) {
    console.error('Error obteniendo apreciaciones:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo apreciaciones.' });
  }
};

[Rest of the file remains unchanged as it was working correctly]