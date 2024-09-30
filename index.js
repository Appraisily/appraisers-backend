// index.js

const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const authorizedUsers = require('./authorizedUsers'); // Lista de usuarios autorizados
const fetch = require('node-fetch');
const app = express();
require('dotenv').config(); // Asegúrate de tener dotenv configurado

// CORS Configuration
const corsOptions = {
  origin: 'https://appraisers-frontend-856401495068.us-central1.run.app', // Tu URL frontend
  credentials: true, // Permitir credenciales (cookies)
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

// Configurar cliente OAuth2 con tu Client ID
const oauthClient = new OAuth2Client('856401495068-ica4bncmu5t8i0muugrn9t8t25nt1hb4.apps.googleusercontent.com'); // Tu Client ID

const client = new SecretManagerServiceClient();

// Función genérica para obtener un secreto
async function getSecret(secretName) {
  const projectId = await client.getProjectId();
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

  const [version] = await client.accessSecretVersion({ name });
  const payload = version.payload.data.toString('utf8');
  return payload;
}

// Configurar variables para secretos
let JWT_SECRET;

// Función para verificar el ID token
async function verifyIdToken(idToken) {
  const ticket = await oauthClient.verifyIdToken({
    idToken: idToken,
    audience: '856401495068-ica4bncmu5t8i0muugrn9t8t25nt1hb4.apps.googleusercontent.com', // Tu Client ID
  });

  const payload = ticket.getPayload();
  return payload;
}

// Middleware de autenticación y autorización usando JWT de la cookie
function authenticate(req, res, next) {
  const token = req.cookies.jwtToken;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Token not provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Almacena información del usuario en req.user

    // Verificar si el usuario está en la lista de autorizados
    if (!authorizedUsers.includes(decoded.email)) {
      return res.status(403).json({ success: false, message: 'Forbidden. You do not have access to this resource.' });
    }

    next();
  } catch (error) {
    console.error('Error verifying JWT:', error);
    res.status(401).json({ success: false, message: 'Invalid token.' });
  }
}

// Ruta de autenticación
app.post('/api/authenticate', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ success: false, message: 'ID Token is required.' });
  }

  try {
    const payload = await verifyIdToken(idToken);
    console.log('Authenticated user:', payload.email);

    // Verificar si el usuario está en la lista de autorizados
    if (!authorizedUsers.includes(payload.email)) {
      return res.status(403).json({ success: false, message: 'Access denied: User not authorized.' });
    }

    // Generar tu propio JWT
    const token = jwt.sign(
      {
        email: payload.email,
        name: payload.name
      },
      JWT_SECRET,
      { expiresIn: '1h' } // Token válido por 1 hora
    );

    // Enviar el JWT como una cookie httpOnly
    res.cookie('jwtToken', token, {
      httpOnly: true,
      secure: true, // Asegúrate de que tu app use HTTPS
      sameSite: 'None', // 'None' para permitir cookies de sitios cruzados
      maxAge: 60 * 60 * 1000 // 1 hora
    });

    // Enviar el nombre del usuario en la respuesta
    res.json({ success: true, name: payload.name });
  } catch (error) {
    console.error('Error verifying ID Token:', error);
    res.status(401).json({ success: false, message: 'Authentication failed.' });
  }
});

// Ruta de logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('jwtToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'None'
  });
  res.json({ success: true, message: 'Successfully logged out.' });
});

// Función para inicializar la API de Google Sheets
async function initializeSheets() {
  try {
    console.log('Accediendo al secreto de la cuenta de servicio...');
    const serviceAccount = await getSecret('service-account-json');
    console.log('Secreto de la cuenta de servicio accedido exitosamente.');

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(serviceAccount),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    console.log('Autenticado con la API de Google Sheets');
    return sheets;
  } catch (error) {
    console.error('Error autenticando con la API de Google Sheets:', error);
    throw error; // Propagar el error para evitar el inicio del servidor
  }
}

// Función para obtener la URL de la imagen
const getImageUrl = async (imageField) => {
  if (!imageField) return null;

  // Si es un número o una cadena que representa un número (ID de imagen)
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
        console.error(`Error fetching image with ID ${mediaId}:`, await mediaResponse.text());
        return null;
      }
      const mediaData = await mediaResponse.json();
      return mediaData.source_url || null;
    } catch (error) {
      console.error(`Error fetching image with ID ${mediaId}:`, error);
      return null;
    }
  }

  // Si es una URL directa
  if (typeof imageField === 'string' && imageField.startsWith('http')) {
    return imageField;
  }

  // Si es un objeto con una propiedad 'url'
  if (typeof imageField === 'object' && imageField.url) {
    return imageField.url;
  }

  return null;
};

// Función para iniciar el servidor
async function startServer() {
  try {
    // Obtener secretos antes de iniciar el servidor
    JWT_SECRET = await getSecret('jwt-secret');
    console.log('JWT_SECRET obtenido exitosamente.');

    const sheets = await initializeSheets();

    // Recuperar credenciales de WordPress desde Secret Manager
    
const WORDPRESS_USERNAME = (await getSecret('wp_username')).trim();
const WORDPRESS_APP_PASSWORD = (await getSecret('wp_app_password')).trim();

    // Almacenar las credenciales en variables de entorno
    process.env.WORDPRESS_USERNAME = WORDPRESS_USERNAME;
    process.env.WORDPRESS_APP_PASSWORD = WORDPRESS_APP_PASSWORD;

    // Tu ID de Google Sheet
    const SPREADSHEET_ID = '1PDdt-tEV78uMGW-813UTcVxC9uzrRXQSmNLCI1rR-xc';
    const SHEET_NAME = 'Pending Appraisals';

    // **Endpoint: Obtener Apreciaciones Pendientes**
    app.get('/api/appraisals', authenticate, async (req, res) => {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A2:H`, // Ajusta el rango según tus columnas
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
          iaDescription: row[7] || '' // Columna H: Descripción de AI
        }));

        console.log(`Total de apreciaciones mapeadas: ${appraisals.length}`);
        res.json(appraisals);
      } catch (error) {
        console.error('Error obteniendo apreciaciones:', error);
        res.status(500).json({ success: false, message: 'Error obteniendo apreciaciones.' });
      }
    });

    // **Endpoint: Obtener Detalles de una Apreciación Específica**
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
          return res.status(404).json({ success: false, message: 'Apreciación no encontrada.' });
        }

        // Incluir descripción del cliente (columna I)
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

        // Extraer el post ID de la URL de WordPress
        const wordpressUrl = appraisal.wordpressUrl;
        const parsedUrl = new URL(wordpressUrl);
        const postId = parsedUrl.searchParams.get('post');

        if (!postId) {
          return res.status(400).json({ success: false, message: 'No se pudo extraer el ID del post de WordPress.' });
        }

        // Construir el endpoint para obtener el post
        const wpEndpoint = `https://www.appraisily.com/wp-json/wp/v2/appraisals/${postId}`;

        // Realizar la solicitud a la API REST de WordPress
        const wpResponse = await fetch(wpEndpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!wpResponse.ok) {
          const errorText = await wpResponse.text();
          console.error('Error obteniendo post de WordPress:', errorText);
          return res.status(500).json({ success: false, message: 'Error obteniendo datos de WordPress.' });
        }

        const wpData = await wpResponse.json();

        // Obtener los campos ACF
        const acfFields = wpData.acf || {};

        // Obtener URLs de imágenes
        const images = {
          main: await getImageUrl(acfFields.main),
          age: await getImageUrl(acfFields.age),
          signature: await getImageUrl(acfFields.signature)
        };

        // Agregar imágenes a la respuesta
        appraisal.images = images;

        // Enviar la respuesta con la descripción del cliente incluida
        res.json(appraisal);
      } catch (error) {
        console.error('Error obteniendo detalles de la apreciación:', error);
        res.status(500).json({ success: false, message: 'Error obteniendo detalles de la apreciación.' });
      }
    });

    // **Endpoint: Completar Apreciación**
    app.post('/api/appraisals/:id/complete', authenticate, async (req, res) => {
      const { id } = req.params; // Número de fila
      const { appraisalValue, description } = req.body;

      if (appraisalValue === undefined || description === undefined) {
        return res.status(400).json({ success: false, message: 'Se requieren valor de apreciación y descripción.' });
      }

      try {
        // Actualizar las columnas J y K con los datos proporcionados
        const updateRange = `${SHEET_NAME}!J${id}:K${id}`;
        const values = [[appraisalValue, description]];

        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: updateRange,
          valueInputOption: 'RAW',
          resource: {
            values: values,
          },
        });

        // Actualizar el estado de la apreciación a "Completed" en la columna F
        const statusUpdateRange = `${SHEET_NAME}!F${id}:F${id}`;
        const statusValues = [['Completed']];

        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: statusUpdateRange,
          valueInputOption: 'RAW',
          resource: {
            values: statusValues,
          },
        });

        // **Actualizar el Campo ACF en WordPress**

        // Obtener detalles de la apreciación para obtener la URL de WordPress
        const appraisalResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A${id}:I${id}`,
        });

        const appraisalRow = appraisalResponse.data.values ? appraisalResponse.data.values[0] : null;

        if (!appraisalRow) {
          return res.status(404).json({ success: false, message: 'Apreciación no encontrada para actualizar en WordPress.' });
        }

        const appraisalWordpressUrl = appraisalRow[6] || ''; // Columna G: WordPress URL

        if (!appraisalWordpressUrl) {
          return res.status(400).json({ success: false, message: 'URL de WordPress no proporcionada.' });
        }

        const parsedWpUrl = new URL(appraisalWordpressUrl);
        const wpPostId = parsedWpUrl.searchParams.get('post');

        if (!wpPostId) {
          return res.status(400).json({ success: false, message: 'No se pudo extraer el ID del post de WordPress.' });
        }

        // **Actualizar el Campo ACF 'value' en WordPress**

        // Construir el endpoint de actualización
        const updateWpEndpoint = `${process.env.WORDPRESS_API_URL}/appraisals/${wpPostId}`;

        // Preparar los datos para actualizar el campo ACF
const updateData = {
  acf: {
    value: appraisalValue // Asegúrate de que 'value' es el nombre correcto del campo ACF
  }
};

// Codificar correctamente el nombre de usuario y la contraseña
const username = encodeURIComponent(process.env.WORDPRESS_USERNAME);
const password = encodeURIComponent(process.env.WORDPRESS_APP_PASSWORD);
const credentials = `${username}:${password}`;
const base64Credentials = Buffer.from(credentials).toString('base64');
const authHeader = 'Basic ' + base64Credentials;

// Realizar la solicitud de actualización a WordPress
const wpUpdateResponse = await fetch(updateWpEndpoint, {
  method: 'POST', // Puedes usar 'PUT' si prefieres
  headers: {
    'Content-Type': 'application/json',
    'Authorization': authHeader
  },
  body: JSON.stringify(updateData)
});
        

        if (!wpUpdateResponse.ok) {
          const errorText = await wpUpdateResponse.text();
          console.error('Error actualizando WordPress:', errorText);
          return res.status(500).json({ success: false, message: 'Error actualizando WordPress.' });
        }

        const wpUpdateData = await wpUpdateResponse.json();
        console.log('WordPress actualizado exitosamente:', wpUpdateData);

        // Responder al frontend
        res.json({ success: true, message: 'Apreciación completada exitosamente y actualizada en WordPress.' });
      } catch (error) {
        console.error('Error completando la apreciación:', error);
        res.status(500).json({ success: false, message: 'Error completando la apreciación.' });
      }
    });

    // Iniciar el Servidor en Todas las Interfaces
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor backend corriendo en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error('Error iniciando el servidor:', error);
    process.exit(1); // Salir si hay un error de inicialización
  }
}

startServer();
