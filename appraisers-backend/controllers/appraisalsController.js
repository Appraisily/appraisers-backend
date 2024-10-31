// controllers/appraisalsController.js

const appraisalStepsModule = require('../shared/appraisalSteps');
const { config } = require('../shared/config');
const sheets = require('../shared/sheets');
const getImageUrl = require('../utils/getImageUrl');

// Inicializar appraisalSteps
const appraisalSteps = appraisalStepsModule.appraisalSteps(sheets, config);

exports.getAppraisals = async (req, res) => {
  try {
    const SPREADSHEET_ID = config.SPREADSHEET_ID;
    const SHEET_NAME = config.SHEET_NAME;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:H`,
    });

    const rows = response.data.values || [];
    console.log(`Total de filas obtenidas: ${rows.length}`);

    const appraisals = rows.map((row, index) => ({
      id: index + 2, // Número de fila en la hoja (A2 corresponde a id=2)
      date: row[0] || '', // Columna A: Fecha
      appraisalType: row[1] || '', // Columna B: Tipo de Apreciación
      identifier: row[2] || '', // Columna C: Número de Apreciación
      status: row[5] || '', // Columna F: Estado
      wordpressUrl: row[6] || '', // Columna G: URL de WordPress
      iaDescription: row[7] || '', // Columna H: Descripción de AI
    }));

    console.log(`Total de apreciaciones mapeadas: ${appraisals.length}`);
    res.json(appraisals);
  } catch (error) {
    console.error('Error obteniendo apreciaciones:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo apreciaciones.' });
  }
};

// Implementa los demás métodos para los endpoints restantes
