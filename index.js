// index.js

const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

const app = express();

// Configuración de CORS
const corsOptions = {
  origin: 'https://appraisers-frontend-856401495068.us-central1.run.app', // Reemplaza con la URL de tu frontend
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json());

// Configurar el cliente de OAuth2 con tu Client ID
const oauthClient = new OAuth2Client('856401495068-ica4bncmu5t8i0muugrn9t8t25nt1hb4.apps.googleusercontent.com'); // Tu Client ID

// Configurar la clave secreta para JWT (debe ser almacenada de forma segura)
const JWT_SECRET = process.env.JWT_SECRET || '161d8ea114e5e8445eed60565a574d8715d637f6b1adf806bbcccede7cb088735330ee9261ee100a41444fd61b1b1e45546c44354b5a734279036bdbc86329b3'; // Reemplaza con una clave segura generada anteriormente

const client = new SecretManagerServiceClient();

// Función para acceder al secreto en Secret Manager
async function getServiceAccount() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
  if (!projectId) {
    throw new Error('GOOGLE_CLOUD_PROJECT no está definido.');
  }

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
    console.log('Accediendo al secreto de la cuenta de servicio...');
    const serviceAccount = await getServiceAccount();
    console.log('Secreto accedido correctamente.');

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

// Función para verificar el ID token
async function verifyIdToken(idToken) {
  const ticket = await oauthClient.verifyIdToken({
    idToken: idToken,
    audience: '856401495068-ica4bncmu5t8i0muugrn9t8t25nt1hb4.apps.googleusercontent.com', // Tu Client ID
  });

  const payload = ticket.getPayload();
  return payload;
}

// Middleware de Autenticación usando JWT
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No autorizado.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Almacenar información del usuario en req.user
    next();
  } catch (error) {
    console.error('Error al verificar el JWT:', error);
    res.status(401).json({ success: false, message: 'Token inválido.' });
  }
}

// Ruta de autenticación
app.post('/api/authenticate', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ success: false, message: 'ID Token es requerido.' });
  }

  try {
    const payload = await verifyIdToken(idToken);
    console.log('Usuario autenticado:', payload.email);

    // Generar un JWT propio
    const token = jwt.sign(
      {
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      },
      JWT_SECRET,
      { expiresIn: '1h' } // Token válido por 1 hora
    );

    res.json({ success: true, token });
  } catch (error) {
    console.error('Error al verificar el ID Token:', error);
    res.status(401).json({ success: false, message: 'Autenticación fallida.' });
  }
});

// Función para configurar y iniciar el servidor
async function startServer() {
  try {
    const sheets = await initializeSheets();

    // ID de tu Google Sheet
    const SPREADSHEET_ID = '1PDdt-tEV78uMGW-813UTcVxC9uzrRXQSmNLCI1rR-xc';
    const SHEET_NAME = 'Pending Appraisals';

    // **Endpoint: Obtener Evaluaciones Pendientes**
    app.get('/api/appraisals', authenticate, async (req, res) => {
      // Ahora, solo los usuarios autenticados pueden acceder a esta ruta
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
    app.post('/api/appraisals/:id', authenticate, async (req, res) => {
      // Solo usuarios autenticados pueden actualizar evaluaciones
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

    // **Iniciar el Servidor en Todas las Interfaces**
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor backend está corriendo en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1); // Salir si hay un error en la inicialización
  }
}

startServer();
