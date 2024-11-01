// googleSheets.js

const { google } = require('googleapis');
// Eliminar la importación de config
// const { config } = require('./config');
const { getSecret } = require('./secretManager'); // Import getSecret from secretManager.js

async function initializeSheets() {
  try {
    // Obtener las credenciales del servicio
    const serviceAccount = await getSecret('service-account-json');

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(serviceAccount),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    console.log('Autenticado con la API de Google Sheets');
    return sheets;
  } catch (error) {
    console.error('Error autenticando con la API de Google Sheets:', error);
    throw error;
  }
}

module.exports = { initializeSheets };
