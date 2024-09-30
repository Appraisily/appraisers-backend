// index.js

const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const authorizedUsers = require('./authorizedUsers'); // Lista de usuarios autorizados

// Importar módulos necesarios
const url = require('url');
const fetch = require('node-fetch'); // Si no lo has importado ya
const app = express();

// Configuración de CORS
const corsOptions = {
  origin: 'https://appraisers-frontend-856401495068.us-central1.run.app', // Reemplaza con la URL de tu frontend
  credentials: true, // Permitir el envío de cookies
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

// Configurar el cliente de OAuth2 con tu Client ID
const oauthClient = new OAuth2Client('856401495068-ica4bncmu5t8i0muugrn9t8t25nt1hb4.apps.googleusercontent.com'); // Tu Client ID

const client = new SecretManagerServiceClient();

// Función genérica para obtener un secreto
async function getSecret(secretName) {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
  if (!projectId) {
    throw new Error('GOOGLE_CLOUD_PROJECT no está definido.');
  }

  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

  const [version] = await client.accessSecretVersion({
    name: name,
  });

  const payload = version.payload.data.toString('utf8');
  return payload;
}

// Configurar variables para los secretos
let JWT_SECRET;
// Ya no necesitamos wpUsername ni wpAppPassword, ya que no usaremos autenticación

// Función para verificar el ID token
async function verifyIdToken(idToken) {
  const ticket = await oauthClient.verifyIdToken({
    idToken: idToken,
    audience: '856401495068-ica4bncmu5t8i0muugrn9t8t25nt1hb4.apps.googleusercontent.com', // Tu Client ID
  });

  const payload = ticket.getPayload();
  return payload;
}

// Middleware de Autenticación y Autorización usando JWT desde la cookie
function authenticate(req, res, next) {
  const token = req.cookies.jwtToken;

  if (!token) {
    return res.status(401).json({ success: false, message: 'No autorizado. Token no proporcionado.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Almacenar información del usuario en req.user

    // Verificar si el usuario está en la lista de autorizados
    if (!authorizedUsers.includes(decoded.email)) {
      return res.status(403).json({ success: false, message: 'Acceso prohibido. No tienes permisos para acceder a este recurso.' });
    }

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

    // Verificar si el usuario está en la lista de autorizados
    if (!authorizedUsers.includes(payload.email)) {
      return res.status(403).json({ success: false, message: 'Acceso prohibido: Usuario no autorizado.' });
    }

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

    // Enviar el JWT como una cookie httpOnly
    res.cookie('jwtToken', token, {
      httpOnly: true,
      secure: true, // Asegúrate de que tu aplicación use HTTPS
      sameSite: 'None', // Cambiar a 'None' para permitir solicitudes cross-origin
      maxAge: 60 * 60 * 1000 // 1 hora
    });

    // **Modificar la respuesta para incluir el nombre del usuario**
    res.json({ success: true, name: payload.name });
  } catch (error) {
    console.error('Error al verificar el ID Token:', error);
    res.status(401).json({ success: false, message: 'Autenticación fallida.' });
  }
});

// Ruta para cerrar sesión
app.post('/api/logout', (req, res) => {
  res.clearCookie('jwtToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'None' // Cambiar a 'None' para mantener consistencia
  });
  res.json({ success: true, message: 'Sesión cerrada exitosamente.' });
});

// Función para inicializar la API de Google Sheets
async function initializeSheets() {
  try {
    console.log('Accediendo al secreto de la cuenta de servicio...');
    const serviceAccount = await getSecret('service-account-json');
    console.log('Secreto accedido correctamente.');

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(serviceAccount),
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
    // Obtener los secretos antes de iniciar el servidor
    JWT_SECRET = await getSecret('jwt-secret');
    console.log('JWT_SECRET obtenido correctamente.');

    // No necesitamos obtener wpUsername ni wpAppPassword

    const sheets = await initializeSheets();

    // ID de tu Google Sheet
    const SPREADSHEET_ID = '1PDdt-tEV78uMGW-813UTcVxC9uzrRXQSmNLCI1rR-xc';
    const SHEET_NAME = 'Pending Appraisals';

    // **Endpoint: Obtener Evaluaciones Pendientes**
    app.get('/api/appraisals', authenticate, async (req, res) => {
      // Ahora, solo los usuarios autenticados y autorizados pueden acceder a esta ruta
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A2:H`, // Ajusta el rango para incluir la columna H
        });

        const rows = response.data.values || [];
        console.log(`Total de filas obtenidas: ${rows.length}`);

        const appraisals = rows.map((row, index) => ({
          id: index + 2, // Número de fila en la hoja (A2 corresponds to id=2)
          date: row[0] || '', // Columna A: Date
          appraisalType: row[1] || '', // Columna B: Appraisal Type
          identifier: row[2] || '', // Columna C: Appraisal Number
          // Column D and E are skipped as per the user's initial requirement
          status: row[5] || '', // Columna F: Status
          wordpressUrl: row[6] || '', // Columna G: WordPress URL
          iaDescription: row[7] || '' // Columna H: IA Description
        }));

        console.log(`Total de evaluaciones mapeadas: ${appraisals.length}`);
        res.json(appraisals);
      } catch (error) {
        console.error('Error al obtener evaluaciones:', error);
        res.status(500).json({ success: false, message: 'Error al obtener evaluaciones.' });
      }
    });

    // **Endpoint: Obtener Detalles de una Evaluación Específica**
app.get('/api/appraisals/:id', authenticate, async (req, res) => {
  const { id } = req.params; // Número de fila

  try {
    // Actualizar el rango para incluir la columna I
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${id}:I${id}`, // Ahora incluye hasta la columna I
    });

    const row = response.data.values ? response.data.values[0] : null;

    if (!row) {
      return res.status(404).json({ success: false, message: 'Evaluación no encontrada.' });
    }

    // Incluir la descripción del cliente (columna I)
    const appraisal = {
      id: id,
      date: row[0] || '',
      appraisalType: row[1] || '',
      identifier: row[2] || '',
      status: row[5] || '',
      wordpressUrl: row[6] || '',
      iaDescription: row[7] || '',
      customerDescription: row[8] || '' // Nueva propiedad
    };

    // Resto del código para obtener el ID del post de WordPress
    const wordpressUrl = appraisal.wordpressUrl;
    const parsedUrl = new URL(wordpressUrl);
    const postId = parsedUrl.searchParams.get('post');

    if (!postId) {
      return res.status(400).json({ success: false, message: 'No se pudo extraer el ID del post de WordPress.' });
    }

    // Construir el endpoint para obtener el post
    const wpEndpoint = `https://www.appraisily.com/wp-json/wp/v2/appraisals/${postId}`;

    // Hacer la solicitud a la API REST de WordPress
    const wpResponse = await fetch(wpEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!wpResponse.ok) {
      const errorText = await wpResponse.text();
      console.error('Error al obtener el post de WordPress:', errorText);
      return res.status(500).json({ success: false, message: 'Error al obtener datos de WordPress.' });
    }

    const wpData = await wpResponse.json();

    // Obtener los campos ACF
    const acfFields = wpData.acf || {};

    // Obtener las URLs de las imágenes
    const images = {
      main: await getImageUrl(acfFields.main),
      age: await getImageUrl(acfFields.age),
      signature: await getImageUrl(acfFields.signature)
    };

    // Agregar las imágenes a la respuesta
    appraisal.images = images;

    // Enviar la respuesta con la descripción del cliente incluida
    res.json(appraisal);
  } catch (error) {
    console.error('Error al obtener detalles de la evaluación:', error);
    res.status(500).json({ success: false, message: 'Error al obtener detalles de la evaluación.' });
  }
});


    // Agregar las imágenes a la respuesta
    appraisal.images = images;

    res.json(appraisal);
  } catch (error) {
    console.error('Error al obtener detalles de la evaluación:', error);
    res.status(500).json({ success: false, message: 'Error al obtener detalles de la evaluación.' });
  }
});

    // Función asíncrona para obtener la URL de la imagen
const getImageUrl = async (imageField) => {
  if (!imageField) return null;

  // Si es un número o un string que representa un número (ID de imagen)
  if (typeof imageField === 'number' || (typeof imageField === 'string' && /^\d+$/.test(imageField))) {
    const mediaId = imageField;
    try {
      const mediaResponse = await fetch(`https://www.appraisily.com/wp-json/wp/v2/media/${mediaId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!mediaResponse.ok) {
        console.error(`Error al obtener la imagen con ID ${mediaId}:`, await mediaResponse.text());
        return null;
      }
      const mediaData = await mediaResponse.json();
      return mediaData.source_url || null;
    } catch (error) {
      console.error(`Error al obtener la imagen con ID ${mediaId}:`, error);
      return null;
    }
  }

  // Si es una URL directa
  if (typeof imageField === 'string' && imageField.startsWith('http')) {
    return imageField;
  }

  // Si es un objeto con la propiedad 'url'
  if (typeof imageField === 'object' && imageField.url) {
    return imageField.url;
  }

  return null;
};


    // **Endpoint: Completar Evaluación**
    app.post('/api/appraisals/:id/complete', authenticate, async (req, res) => {
      const { id } = req.params; // Número de fila
      const { appraisalValue, description } = req.body;

      if (appraisalValue === undefined || description === undefined) {
        return res.status(400).json({ success: false, message: 'Appraisal value and description are required.' });
      }

      try {
        // Actualizar las columnas I y J con los datos proporcionados
        const updateRange = `${SHEET_NAME}!I${id}:J${id}`;
        const values = [[appraisalValue, description]];

        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: updateRange,
          valueInputOption: 'RAW',
          resource: {
            values: values,
          },
        });

        // Actualizar el estatus de la evaluación a "Completada" (Columna F)
        const statusUpdateRange = `${SHEET_NAME}!F${id}:F${id}`;
        const statusValues = [['Completada']];

        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: statusUpdateRange,
          valueInputOption: 'RAW',
          resource: {
            values: statusValues,
          },
        });

        res.json({ success: true, message: 'Evaluación completada exitosamente.' });
      } catch (error) {
        console.error('Error al completar la evaluación:', error);
        res.status(500).json({ success: false, message: 'Error al completar la evaluación.' });
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
