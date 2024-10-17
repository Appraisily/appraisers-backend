// index.js

const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const fetch = require('node-fetch');
const app = express();
const { PubSub } = require('@google-cloud/pubsub');


const authorizedUsers = require('./shared/authorizedUsers'); // Ruta actualizada
const { getSecret } = require('./shared/secretManager'); // Ruta actualizada
const { config, initializeConfig } = require('./shared/config'); // Ruta actualizada
const appraisalStepsModule = require('./shared/appraisalSteps'); // Ruta actualizada



require('dotenv').config();

// Configuración de CORS
const corsOptions = {
  origin: 'https://appraisers-frontend-856401495068.us-central1.run.app',
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

// Configurar cliente OAuth2 con tu Client ID
const oauthClient = new OAuth2Client('TU_CLIENT_ID');

const client = new SecretManagerServiceClient();

// Inicializar Pub/Sub
const pubsub = new PubSub({
  projectId: config.GCP_PROJECT_ID, // Asegúrate de tener esta variable en tu configuración
});




// IIFE asíncrona para inicializar el servidor
(async () => {
  try {
    // Inicializar cliente de Google Sheets API
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const authClient = await auth.getClient();

    
    // Importar funciones de appraisalSteps
    const {
      setAppraisalValue,
      mergeDescriptions,
      updatePostTitle,
      insertTemplate,
      buildPDF,
      sendEmailToCustomer,
      markAppraisalAsCompleted,
    } = require('./appraisalSteps');

  

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






// Configurar variables para secretos
let JWT_SECRET;
    let sheets; // Mover sheets al ámbito global
let SPREADSHEET_ID;
let SHEET_NAME;

        // Inicializar Google Sheets (si no lo has inicializado aún)
  sheets = await initializeSheets();


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
      // **No es necesario obtener los secretos aquí, ya los obtuvimos en initializeConfig()**
    JWT_SECRET = config.JWT_SECRET;
    console.log('JWT_SECRET obtenido desde config.');



    // Asignar las credenciales de WordPress desde config
    process.env.WORDPRESS_USERNAME = config.WORDPRESS_USERNAME;
    process.env.WORDPRESS_APP_PASSWORD = config.WORDPRESS_APP_PASSWORD;
    process.env.WORDPRESS_API_URL = config.WORDPRESS_API_URL;

    console.log('Credenciales de WordPress asignadas desde config.');

    // Asignar las credenciales de SendGrid desde config
    process.env.SENDGRID_API_KEY = config.SENDGRID_API_KEY;
    process.env.SENDGRID_EMAIL = config.SENDGRID_EMAIL;

    console.log('Credenciales de SendGrid asignadas desde config.');

    // Asignar SPREADSHEET_ID y SHEET_NAME desde config
    const SPREADSHEET_ID = config.SPREADSHEET_ID;
    const SHEET_NAME = config.SHEET_NAME;

     // Inicializar appraisalSteps con sheets y config
    const appraisalSteps = appraisalStepsModule.appraisalSteps(sheets, config);

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


// Endpoint para actualizar un campo ACF específico
app.put('/api/appraisals/:id/update-acf-field', authenticate, async (req, res) => {
  const { id } = req.params;
  const { fieldName, fieldValue } = req.body;

  if (!fieldName) {
    return res.status(400).json({ success: false, message: 'Field name is required.' });
  }

  try {
    // Construir el endpoint de WordPress
    const wpEndpoint = `${process.env.WORDPRESS_API_URL}/appraisals/${id}`;

    // Autenticación con WordPress
    const authHeader = 'Basic ' + Buffer.from(`${encodeURIComponent(process.env.WORDPRESS_USERNAME)}:${process.env.WORDPRESS_APP_PASSWORD.trim()}`).toString('base64');

    // Obtener el post actual para mantener otros campos ACF
    const wpResponse = await fetch(wpEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
    });

    if (!wpResponse.ok) {
      const errorText = await wpResponse.text();
      console.error(`[update-acf-field] Error obteniendo post de WordPress: ${errorText}`);
      return res.status(500).json({ success: false, message: 'Error fetching WordPress post.' });
    }

    const wpData = await wpResponse.json();
    const acfFields = wpData.acf || {};

    // Actualizar el campo ACF específico
    acfFields[fieldName] = fieldValue;

    // Actualizar los campos ACF en WordPress
    const updateResponse = await fetch(wpEndpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({ acf: acfFields })
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error(`[update-acf-field] Error actualizando ACF field: ${errorText}`);
      return res.status(500).json({ success: false, message: 'Error updating ACF field in WordPress.' });
    }

    res.json({ success: true, message: `Field '${fieldName}' updated successfully.` });
  } catch (error) {
    console.error('Error updating ACF field:', error);
    res.status(500).json({ success: false, message: error.message });
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


// **Endpoint: Completar el Proceso de la Apreciación**
// MODIFICACIÓN PRINCIPAL: Encolar la tarea en Pub/Sub en lugar de procesarla directamente
app.post('/api/appraisals/:id/complete-process', authenticate, async (req, res) => {
  const { id } = req.params;
  const { appraisalValue, description } = req.body;

  if (!appraisalValue || !description) {
    return res.status(400).json({ success: false, message: 'Appraisal Value and description are required.' });
  }

  try {
    // Crear el mensaje para Pub/Sub
    const task = {
      id,
      appraisalValue,
      description,
    };

    const dataBuffer = Buffer.from(JSON.stringify(task));

    // Publicar el mensaje en Pub/Sub
    await pubsub.topic('appraisal-tasks').publish(dataBuffer);

    console.log(`[index.js] Enqueued appraisal task for id: ${id}`);

    // Responder inmediatamente al cliente
    res.json({ success: true, message: 'Appraisal submitted successfully.' });
  } catch (error) {
    console.error(`Error encolando la apreciación ${id}:`, error);
    res.status(500).json({ success: false, message: `Error submitting appraisal: ${error.message}` });
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


        // Iniciar el Servidor en Todas las Interfaces
        const PORT = process.env.PORT || 8080;
        app.listen(PORT, '0.0.0.0', () => {
          console.log(`Servidor backend corriendo en el puerto ${PORT}`);
        });
      } catch (error) {
        console.error('Error iniciando el servidor:', error);
        process.exit(1);
      }
    }
    await initializeConfig();

    // **Llamar a la función startServer**
    await startServer();

  } catch (error) {
    console.error('Error en la inicialización:', error);
    process.exit(1);
  }
})(); // <-- Aquí cerramos y ejecutamos la IIFE
