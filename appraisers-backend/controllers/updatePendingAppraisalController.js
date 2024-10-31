
// controllers/updatePendingAppraisalController.js

const { config } = require('../shared/config');
const sheets = require('../shared/sheets');

exports.updatePendingAppraisal = async (req, res) => {
  const { id, updates } = req.body;

  if (!id || !updates) {
    return res.status(400).json({ success: false, message: 'ID and updates are required.' });
  }

  try {
    const SPREADSHEET_ID = config.SPREADSHEET_ID;
    const SHEET_NAME = config.SHEET_NAME;

    // Construir el rango para la fila específica
    const range = `${SHEET_NAME}!A${id}:Z${id}`; // Ajusta las columnas según tus necesidades

    // Obtener la fila actual
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: range,
    });

    const row = response.data.values ? response.data.values[0] : null;

    if (!row) {
      return res.status(404).json({ success: false, message: 'Appraisal not found.' });
    }

    // Actualizar los campos necesarios
    // Supongamos que 'updates' es un objeto con claves como 'status', 'description', etc.
    // Necesitas mapear estas claves a las columnas correspondientes en Google Sheets

    // Por ejemplo, si 'status' está en la columna F (índice 5), actualizamos row[5]
    // Necesitarás una lógica para mapear las claves de 'updates' a los índices de columnas

    // Ejemplo simplificado:
    const columnMapping = {
      status: 5, // Columna F
      description: 7, // Columna H
      // Agrega más mapeos según sea necesario
    };

    for (const [key, value] of Object.entries(updates)) {
      const columnIndex = columnMapping[key];
      if (columnIndex !== undefined) {
        row[columnIndex] = value;
      }
    }

    // Actualizar la fila en Google Sheets
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: range,
      valueInputOption: 'RAW',
      resource: {
        values: [row],
      },
    });

    res.json({ success: true, message: 'Appraisal updated successfully.' });
  } catch (error) {
    console.error('Error updating pending appraisal:', error);
    res.status(500).json({ success: false, message: 'Error updating pending appraisal.' });
  }
};
