// index.js.

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

// **Función para Actualizar el Flag en ACF**
async function updateShortcodesFlag(wpPostId, authHeader) {
  try {
    const wpEndpoint = `${process.env.WORDPRESS_API_URL}/appraisals/${wpPostId}`;
    console.log(`[updateShortcodesFlag] Actualizando flag en ACF para el post ID: ${wpPostId}`);

    // Obtener el contenido actual del post para mantener otros campos
    const currentPostResponse = await fetch(wpEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
    });

    if (!currentPostResponse.ok) {
      const errorText = await currentPostResponse.text();
      console.error(`[updateShortcodesFlag] Error obteniendo el post actual para actualizar ACF: ${errorText}`);
      throw new Error('Error obteniendo el post actual para actualizar ACF.');
    }

    const currentPostData = await currentPostResponse.json();
    const updatedACF = {
      ...currentPostData.acf,
      shortcodes_inserted: true // Asumiendo que el campo ACF es un booleano
    };

    // Actualizar el campo ACF en WordPress
    const updateACFResponse = await fetch(wpEndpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        acf: updatedACF
      })
    });

    if (!updateACFResponse.ok) {
      const errorText = await updateACFResponse.text();
      console.error(`[updateShortcodesFlag] Error actualizando ACF en WordPress: ${errorText}`);
      throw new Error('Error actualizando ACF en WordPress.');
    }

    console.log(`[updateShortcodesFlag] Flag 'shortcodes_inserted' actualizado a 'true' en WordPress.`);
  } catch (error) {
    console.error(`[updateShortcodesFlag] ${error.message}`);
    throw error; // Propagar el error para manejarlo en el caller
  }
}




// Función genérica para obtener un secreto
async function getSecret(secretName) {
  try {
    const projectId = await client.getProjectId();
    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

    const [version] = await client.accessSecretVersion({ name });
    const payload = version.payload.data.toString('utf8');
    return payload;
  } catch (error) {
    console.error(`Error obteniendo el secreto ${secretName}:`, error);
    throw new Error(`No se pudo obtener el secreto ${secretName}`);
  }
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
    const WORDPRESS_API_URL = (await getSecret('WORDPRESS_API_URL')).trim();

    // Asignar las credenciales y URL a variables de entorno
    process.env.WORDPRESS_USERNAME = WORDPRESS_USERNAME;
    process.env.WORDPRESS_APP_PASSWORD = WORDPRESS_APP_PASSWORD;
    process.env.WORDPRESS_API_URL = WORDPRESS_API_URL;

    console.log('WORDPRESS_USERNAME:', process.env.WORDPRESS_USERNAME);
    console.log('WORDPRESS_APP_PASSWORD:', process.env.WORDPRESS_APP_PASSWORD ? 'Loaded' : 'Not Loaded');
    console.log('WORDPRESS_API_URL cargado correctamente:', process.env.WORDPRESS_API_URL);

    // Recuperar credenciales de SendGrid desde Secret Manager
    const SENDGRID_API_KEY = (await getSecret('SENDGRID_API_KEY')).trim();
    const SENDGRID_EMAIL = (await getSecret('SENDGRID_EMAIL')).trim();

    // Asignar las credenciales a variables de entorno
    process.env.SENDGRID_API_KEY = SENDGRID_API_KEY;
    process.env.SENDGRID_EMAIL = SENDGRID_EMAIL;

    console.log('SENDGRID_API_KEY y SENDGRID_EMAIL cargados correctamente.');

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
    app.get('/api/appraisals/:id/list', authenticate, async (req, res) => {
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

        console.log(`[api/appraisals/${id}] Post ID extraído: ${postId}`);

        // Construir el endpoint para obtener el post
        const wpEndpoint = `${process.env.WORDPRESS_API_URL}/appraisals/${postId}`;
        console.log(`[api/appraisals/${id}] Endpoint de WordPress: ${wpEndpoint}`);

        // Realizar la solicitud a la API REST de WordPress
        const wpResponse = await fetch(wpEndpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(`${encodeURIComponent(process.env.WORDPRESS_USERNAME)}:${process.env.WORDPRESS_APP_PASSWORD.trim()}`).toString('base64')}`
          }
        });

        if (!wpResponse.ok) {
          const errorText = await wpResponse.text();
          console.error(`[api/appraisals/${id}] Error obteniendo post de WordPress: ${errorText}`);
          return res.status(500).json({ success: false, message: 'Error obteniendo datos de WordPress.' });
        }

        const wpData = await wpResponse.json();
        console.log(`[api/appraisals/${id}] Datos de WordPress obtenidos:`, wpData);

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

    // **Endpoint: Save PDF and Doc Links in Google Sheets**
app.post('/api/appraisals/:id/save-links', authenticate, async (req, res) => {
  const { id } = req.params; // Número de fila en Google Sheets
  const { pdfLink, docLink } = req.body;

  // Validación de los datos recibidos
  if (!pdfLink || !docLink) {
    return res.status(400).json({ success: false, message: 'PDF Link y Doc Link son requeridos.' });
  }

  try {
    // Actualizar las columnas M y N en Google Sheets
    const updateRange = `${SHEET_NAME}!M${id}:N${id}`; // Columnas M y N
    const values = [[pdfLink, docLink]];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: updateRange,
      valueInputOption: 'RAW',
      resource: {
        values: values,
      },
    });

    console.log(`[save-links] Actualizadas las columnas M y N para la fila ${id} con PDF Link: ${pdfLink} y Doc Link: ${docLink}`);

    res.json({ success: true, message: 'PDF Link y Doc Link guardados exitosamente en Google Sheets.' });
  } catch (error) {
    console.error('Error guardando los links en Google Sheets:', error);
    res.status(500).json({ success: false, message: 'Error guardando los links en Google Sheets.' });
  }
});


// **Endpoint: Obtener Apreciaciones Completadas**
app.get('/api/appraisals/completed', authenticate, async (req, res) => {
  try {
    const sheetName = 'Completed Appraisals'; // Asegúrate de que este es el nombre correcto de la hoja
    const range = `${sheetName}!A2:H`; // Definición correcta del rango
    console.log(`Fetching completed appraisals with range: ${range}`);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: range, // Usar la variable 'range' definida arriba
    });

    const rows = response.data.values || [];
    console.log(`Total de filas obtenidas (Completadas): ${rows.length}`);

    // Verificar si 'rows' es un arreglo
    if (!Array.isArray(rows)) {
      console.error('La respuesta de Google Sheets no es un arreglo:', rows);
      throw new Error('La respuesta de Google Sheets no es un arreglo.');
    }

    // Loguear cada fila para depuración
    rows.forEach((row, index) => {
      console.log(`Fila ${index + 2}:`, row);
    });

    const completedAppraisals = rows.map((row, index) => ({
      id: index + 2, // Número de fila en la hoja (A2 corresponde a id=2)
      date: row[0] || '', // Columna A: Fecha
      appraisalType: row[1] || '', // Columna B: Tipo de Apreciación
      identifier: row[2] || '', // Columna C: Número de Apreciación
      status: row[5] || '', // Columna F: Estado
      wordpressUrl: row[6] || '', // Columna G: URL de WordPress
      iaDescription: row[7] || '' // Columna H: Descripción de AI
    }));

    console.log(`Total de apreciaciones completadas mapeadas: ${completedAppraisals.length}`);
    res.json(completedAppraisals);
  } catch (error) {
    console.error('Error obteniendo apreciaciones completadas:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo apreciaciones completadas.' });
  }
});


app.post('/api/appraisals/:id/complete-process', authenticate, async (req, res) => {
  const { id } = req.params;
  const { appraisalValue, description } = req.body;

  if (!appraisalValue || !description) {
    return res.status(400).json({ success: false, message: 'Appraisal Value and description are required.' });
  }

  try {
    await setAppraisalValue(id, appraisalValue, description);
    await mergeDescriptions(id, description);
    await updatePostTitle(id);
    await insertTemplate(id);
    await buildPDF(id);
    await sendEmailToCustomer(id);
    await markAppraisalAsCompleted(id, appraisalValue, description);

    res.json({ success: true, message: 'Appraisal completed successfully.' });
  } catch (error) {
    console.error(`Error completing appraisal ${id}:`, error);
    res.status(500).json({ success: false, message: `Error completing appraisal: ${error.message}` });
  }
});



    
// **Endpoint: Obtener session_ID a partir de postId**
app.post('/api/appraisals/get-session-id', authenticate, async (req, res) => {
  const { postId } = req.body;

  if (!postId) {
    return res.status(400).json({ success: false, message: 'postId es requerido.' });
  }

  try {
    // Construir el endpoint de WordPress para obtener el post
    const wpEndpoint = `${process.env.WORDPRESS_API_URL}/appraisals/${postId}`;
    console.log(`[get-session-id] Endpoint de WordPress: ${wpEndpoint}`);

    // Realizar la solicitud GET a la API REST de WordPress
    const wpResponse = await fetch(wpEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${encodeURIComponent(process.env.WORDPRESS_USERNAME)}:${process.env.WORDPRESS_APP_PASSWORD.trim()}`).toString('base64')}`
      }
    });

    if (!wpResponse.ok) {
      const errorText = await wpResponse.text();
      console.error(`[get-session-id] Error obteniendo post de WordPress: ${errorText}`);
      return res.status(500).json({ success: false, message: 'Error obteniendo datos de WordPress.' });
    }

    const wpData = await wpResponse.json();
    const acfFields = wpData.acf || {};
    const session_ID = acfFields.session_id || '';

    if (!session_ID) {
      console.error(`[get-session-id] session_ID no encontrado en el post de WordPress.`);
      return res.status(404).json({ success: false, message: 'session_ID no encontrado en el post de WordPress.' });
    }

    console.log(`[get-session-id] session_ID extraído: ${session_ID}`);
    res.json({ success: true, session_ID });
  } catch (error) {
    console.error('Error obteniendo session_ID:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo session_ID.' });
  }
});


app.post('/api/appraisals/:id/set-value', authenticate, async (req, res) => {
  const { id } = req.params;
  const { appraisalValue, description } = req.body;

  if (appraisalValue === undefined || description === undefined) {
    return res.status(400).json({ success: false, message: 'Appraisal Value and description are required.' });
  }

  try {
    await setAppraisalValue(id, appraisalValue, description);
    res.json({ success: true, message: 'Appraisal Value and description updated successfully in Google Sheets and WordPress.' });
  } catch (error) {
    console.error('Error in set-value endpoint:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});



    

app.post('/api/appraisals/:id/complete', authenticate, async (req, res) => {
  const { id } = req.params;
  const { appraisalValue, description } = req.body;

  if (appraisalValue === undefined || description === undefined) {
    return res.status(400).json({ success: false, message: 'Appraisal Value and description are required.' });
  }

  try {
    await markAppraisalAsCompleted(id, appraisalValue, description);
    res.json({ success: true, message: 'Appraisal completed successfully.' });
  } catch (error) {
    console.error('Error completing the appraisal:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});



  // Endpoint to insert template in the wordpress post  
app.post('/api/appraisals/:id/insert-template', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    await insertTemplate(id);
    res.json({ success: true, message: 'Shortcodes inserted successfully in WordPress post.' });
  } catch (error) {
    console.error('Error inserting shortcodes in WordPress:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});



    

// **Función para actualizar el flag en ACF**
async function updateShortcodesFlag(wpPostId, authHeader) {
  const updateWpEndpoint = `${process.env.WORDPRESS_API_URL}/appraisals/${wpPostId}`;
  console.log(`[updateShortcodesFlag] Actualizando el flag en ACF a 'true' en el post ID: ${wpPostId}`);

  const updateFlagResponse = await fetch(updateWpEndpoint, {
    method: 'PUT', // Método correcto para actualizar
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      acf: {
        shortcodes_inserted: true
      }
    })
  });

  if (!updateFlagResponse.ok) {
    const errorText = await updateFlagResponse.text();
    console.error(`[updateShortcodesFlag] Error actualizando el flag en ACF: ${errorText}`);
    throw new Error('Error actualizando el flag en ACF.');
  }

  const updateFlagData = await updateFlagResponse.json();
  console.log(`[updateShortcodesFlag] Flag en ACF actualizado exitosamente:`, updateFlagData);
}

    
// **Endpoint: Obtener enlaces desde WordPress y guardarlos en Google Sheets**
app.post('/api/appraisals/:id/update-links', authenticate, async (req, res) => {
  const { id } = req.params; // Número de fila en Google Sheets
  const { postId } = req.body; // ID del post de WordPress

  if (!postId) {
    return res.status(400).json({ success: false, message: 'postId es requerido.' });
  }

  try {
    // Obtener los enlaces desde los campos ACF de WordPress
    const wpEndpoint = `${process.env.WORDPRESS_API_URL}/appraisals/${postId}`;
    console.log(`[update-links] Endpoint de WordPress: ${wpEndpoint}`);

    // Autenticación con WordPress
    const credentialsString = `${encodeURIComponent(process.env.WORDPRESS_USERNAME)}:${process.env.WORDPRESS_APP_PASSWORD.trim()}`;
    const base64Credentials = Buffer.from(credentialsString).toString('base64');
    const authHeader = 'Basic ' + base64Credentials;

    // Obtener el post de WordPress
    const wpResponse = await fetch(wpEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
    });

    if (!wpResponse.ok) {
      const errorText = await wpResponse.text();
      console.error(`[update-links] Error obteniendo post de WordPress: ${errorText}`);
      return res.status(500).json({ success: false, message: 'Error obteniendo datos de WordPress.' });
    }

    const wpData = await wpResponse.json();
    const acfFields = wpData.acf || {};

    const pdfLink = acfFields.pdflink || '';
    const docLink = acfFields.doclink || '';

    if (!pdfLink || !docLink) {
      console.error(`[update-links] Enlaces no encontrados en los campos ACF de WordPress.`);
      return res.status(404).json({ success: false, message: 'Enlaces no encontrados en los campos ACF de WordPress.' });
    }

    // Actualizar las columnas M y N en Google Sheets
    const updateRange = `${SHEET_NAME}!M${id}:N${id}`; // Columnas M y N
    const values = [[pdfLink, docLink]];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: updateRange,
      valueInputOption: 'RAW',
      resource: {
        values: values,
      },
    });

    console.log(`[update-links] Actualizadas las columnas M y N para la fila ${id} con PDF Link: ${pdfLink} y Doc Link: ${docLink}`);

    res.json({ success: true, message: 'Enlaces actualizados exitosamente en Google Sheets.' });
  } catch (error) {
    console.error('Error actualizando los enlaces en Google Sheets:', error);
    res.status(500).json({ success: false, message: 'Error actualizando los enlaces en Google Sheets.' });
  }
});
    

app.post('/api/appraisals/:id/send-email', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    await sendEmailToCustomer(id);
    res.json({ success: true, message: 'Email sent to customer successfully.' });
  } catch (error) {
    console.error('Error sending email to customer:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});





app.post('/api/appraisals/:id/update-title', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    await updatePostTitle(id);
    res.json({ success: true, message: 'WordPress post title updated successfully.' });
  } catch (error) {
    console.error('Error updating post title in WordPress:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Iniciar el Servidor en Todas las Interfaces (ya existente)

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
