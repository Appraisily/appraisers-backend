const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const app = express();

// Configuración de CORS
const corsOptions = {
  origin: 'https://appraisers-frontend-856401495068.us-central1.run.app', // URL de tu frontend
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json());

const client = new SecretManagerServiceClient();

// Función para acceder al secreto en Secret Manager
async function getServiceAccount() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
  const secretName = `projects/${projectId}/secrets/service-account-json/versions/latest`;

  const [version] = await client.accessSecretVersion({
    name: secretName,
  });

  const payload = version.payload.data.toString('utf8');
  return JSON.parse(payload);
}

// Función para inicializar la API de Google Sheets
async function initializeSheets() {
  try {
    const serviceAccount = await getServiceAccount();
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    console.log('Autenticado con la API de Google Sheets');
    return sheets;
  } catch (error) {
    console.error('Error al autenticar con la API de Google Sheets:', error);
    throw error; // Propagar el error para evitar iniciar el servidor
  }
}

// Función para configurar y iniciar el servidor
async function startServer() {
  try {
    const sheets = await initializeSheets();

    // ID de tu Google Sheet
    const SPREADSHEET_ID = '1PDdt-tEV78uMGW-813UTcVxC9uzrRXQSmNLCI1rR-xc';
    const SHEET_NAME = 'Pending Appraisals';

    // **Endpoint: Obtener Evaluaciones Pendientes**
    app.get('/api/appraisals', async (req, res) => {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A2:I`,
        });

        const rows = response.data.values || [];
        const appraisals = rows.map((row, index) => ({
          id: index + 2, // Número de fila en la hoja
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
        console.error('Error al obtener evaluaciones:', error);
        res.status(500).send('Error al obtener evaluaciones');
      }
    });

    // **Endpoint: Actualizar Evaluación**
    app.post('/api/appraisals/:id', async (req, res) => {
      const { id } = req.params; // Número de fila
      const { appraisalValue, humanDescription } = req.body;

      try {
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

        res.send('Evaluación actualizada exitosamente');
      } catch (error) {
        console.error('Error al actualizar evaluación:', error);
        res.status(500).send('Error al actualizar evaluación');
      }
    });

    // **Ruta de Prueba Temporal para Verificar Conexión con Google Sheets**
    app.get('/api/test-sheets', async (req, res) => {
      try {
        const response = await sheets.spreadsheets.get({
          spreadsheetId: SPREADSHEET_ID,
        });
        res.send('Conexión exitosa con Google Sheets API');
      } catch (error) {
        console.error('Error al conectar con Google Sheets API:', error);
        res.status(500).send('Error al conectar con Google Sheets API');
      }
    });

    // **Iniciar el Servidor**
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
      console.log(`Servidor backend está corriendo en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1); // Salir si hay un error en la inicialización
  }
}

startServer();
