// index.js

const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const fetch = require('node-fetch');
const { PubSub } = require('@google-cloud/pubsub');
const { OpenAI } = require('openai');

const authorizedUsers = require('./shared/authorizedUsers'); // Ruta actualizada
const { getSecret } = require('./shared/secretManager'); // Ruta actualizada
const { config, initializeConfig } = require('./shared/config'); // Ruta actualizada
const appraisalStepsModule = require('./shared/appraisalSteps'); // Ruta actualizada

require('dotenv').config();

const app = express();

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
const oauthClient = new OAuth2Client('TU_CLIENT_ID'); // Reemplaza con tu Client ID real

const client = new SecretManagerServiceClient();

// Inicializar Pub/Sub (Se inicializará después de cargar la configuración)
let pubsub;

// Función para verificar el ID token
async function verifyIdToken(idToken) {
  const ticket = await oauthClient.verifyIdToken({
    idToken: idToken,
    audience: 'TU_CLIENT_ID', // Reemplaza con tu Client ID real
  });

  const payload = ticket.getPayload();
  return payload;
}

// Middleware de autenticación y autorización usando JWT de la cookie
function authenticateMiddleware(JWT_SECRET) {
  return function authenticate(req, res, next) {
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
  };
}

// Función de validación para set-value
function validateSetValueData(req, res, next) {
  const { appraisalValue, description } = req.body;

  if (appraisalValue === undefined || description === undefined) {
    return res.status(400).json({ success: false, message: 'Appraisal Value and description are required.' });
  }

  // Agrega más validaciones según sea necesario

  next();
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
          'Content-Type': 'application/json',
        },
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

// Función para iniciar el servidor
async function startServer() {
  try {
    // Inicializar configuración
    await initializeConfig();

    // Asignar variables de configuración
    const JWT_SECRET = config.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('JWT_SECRET no está configurado.');
      process.exit(1);
    }
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

    // Inicializar Pub/Sub con el projectId desde config
    pubsub = new PubSub({
      projectId: config.GCP_PROJECT_ID,
    });

    // Inicializar Google Sheets
    const sheets = await initializeSheets();

    // Inicializar appraisalSteps con sheets y config
    const appraisalSteps = appraisalStepsModule.appraisalSteps(sheets, config);

    // Definir el middleware de autenticación con el JWT_SECRET
    const authenticate = authenticateMiddleware(JWT_SECRET);

    // **Definir endpoints después de configurar todo**

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
            name: payload.name,
          },
          JWT_SECRET,
          { expiresIn: '1h' } // Token válido por 1 hora
        );

        // Enviar el JWT como una cookie httpOnly
        res.cookie('jwtToken', token, {
          httpOnly: true,
          secure: true, // Asegúrate de que tu app use HTTPS
          sameSite: 'None', // 'None' para permitir cookies de sitios cruzados
          maxAge: 60 * 60 * 1000, // 1 hora
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
        sameSite: 'None',
      });
      res.json({ success: true, message: 'Successfully logged out.' });
    });

    // Endpoint para verificar si el usuario está autenticado
    app.get('/api/check-auth', authenticate, (req, res) => {
      res.json({ authenticated: true, name: req.user.name });
    });

    // **Endpoint: Actualizar Estado de Apreciación Pendiente**
app.post('/api/update-pending-appraisal', async (req, res) => {
  try {
    // Loggear el payload completo recibido
    console.log('Cloud Run: Payload recibido -', JSON.stringify(req.body));

    // Verificar el shared secret
    const incomingSecret = req.headers['x-shared-secret'];
    if (incomingSecret !== config.SHARED_SECRET) {
      console.warn('Cloud Run: Autenticación fallida - Shared secret inválido.');
      return res.status(403).json({ success: false, message: 'Forbidden: Invalid shared secret.' });
    }
    console.log('Cloud Run: Shared secret verificado correctamente.');

    // Obtener los datos del payload
    let { description, images, post_id, post_edit_url, customer_email } = req.body;
    let customer_name = ''; // Inicializamos customer_name

    // Loggear cada campo individualmente
    console.log(`Cloud Run: description - ${description}`);
    console.log(`Cloud Run: images - ${JSON.stringify(images)}`);
    console.log(`Cloud Run: post_id - ${post_id}`);
    console.log(`Cloud Run: post_edit_url - ${post_edit_url}`);
    console.log(`Cloud Run: customer_email - ${customer_email}`);

    // Validar campos requeridos
    if (!customer_email || !post_id || typeof images !== 'object' || !post_edit_url) {
      console.warn('Cloud Run: Datos incompletos recibidos en el endpoint.');
      console.log('Cloud Run: Enviando respuesta 400 al cliente.');
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    } else {
      console.log('Cloud Run: Todos los campos requeridos están presentes.');
    }

    // Enviar respuesta inmediatamente al cliente
    res.json({ success: true, message: 'Appraisal status updated successfully.' });
    console.log('Cloud Run: Respuesta 200 enviada al cliente.');

    // Ejecutar tareas en segundo plano sin esperar a que finalicen
    (async () => {
      try {
        // Si 'description' es undefined, obtenerla desde WordPress
        if (!description) {
          console.log('Cloud Run: Description no proporcionada, obteniendo desde WordPress...');
          try {
            const wpEndpoint = `${process.env.WORDPRESS_API_URL}/appraisals/${post_id}`;
            console.log(`[update-pending-appraisal] Endpoint de WordPress: ${wpEndpoint}`);

            const authHeader = 'Basic ' + Buffer.from(`${encodeURIComponent(process.env.WORDPRESS_USERNAME)}:${process.env.WORDPRESS_APP_PASSWORD.trim()}`).toString('base64');

            const wpResponse = await fetch(wpEndpoint, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
              },
            });

            if (!wpResponse.ok) {
              const errorText = await wpResponse.text();
              console.error(`[update-pending-appraisal] Error obteniendo post de WordPress: ${errorText}`);
              return; // O manejar el error apropiadamente
            }

            const wpData = await wpResponse.json();
            const acfFields = wpData.acf || {};
            description = acfFields.description || wpData.content.rendered || '';
            console.log(`[update-pending-appraisal] Descripción obtenida de WordPress: ${description}`);
          } catch (error) {
            console.error('Error obteniendo datos de WordPress:', error);
            return;
          }
        }

        // Continuar con el procesamiento si tenemos una descripción válida
        if (!description) {
          console.error('No se pudo obtener una descripción válida.');
          return;
        }

        // Inicializar OpenAI con la API key desde config
        const openaiApiKey = config.OPENAI_API_KEY; // Usar la clave desde config
        const openai = new OpenAI({
          apiKey: openaiApiKey,
        });

        // Preparar el nuevo prompt detallado para GPT-4 siguiendo la estructura del ejemplo
        const condensedInstructions = `
Please condense the following detailed artwork description into a synthetic, concise summary of around 50 words, retaining as much key information as possible. Follow the example format below:

Example Format: "[Style] [Medium] ([Date]), [Size]. [Color Palette]. [Composition details]. [Brushwork/Texture]. [Mood]. [Condition/details]."

Description: "[Insert the detailed artwork description here]"

Tips for Effective Condensation:

Identify Key Elements:

- Style: Impressionist, Realist, etc.
- Medium: Oil on canvas, watercolor, etc.
- Date: Century or specific year if available.
- Size: Medium, large, specific dimensions if known.
- Color Palette: Dominant colors used.
- Composition: Main elements and their arrangement.
- Brushwork/Texture: Loose, expressive, dynamic, etc.
- Mood: Serene, tranquil, contemplative, etc.
- Condition/Details: Missing views, signature, age, etc.

Use Concise Language:

- Combine related information into single phrases.
- Use commas to separate different attributes.

Maintain Essential Information:

- Ensure that the summary includes all critical aspects without unnecessary details.
                `;

        // Construir el contenido del mensaje con las instrucciones detalladas
        const messagesWithRoles = [
          {
            role: 'user',
            content: `
${condensedInstructions}

Description: "${description}"
                    `,
          },
        ];

        console.info("Sending data to OpenAI's API for description generation.");

        // Llamar a la API de Chat Completion de OpenAI para obtener la descripción
        let responseContent;
        try {
          const openaiResponse = await openai.chat.completions.create({
            model: 'gpt-4', // Reemplaza con el nombre correcto del modelo que soporta tus requerimientos
            messages: messagesWithRoles,
            temperature: 0.7, // Ajusta según sea necesario
          });

          responseContent = openaiResponse.choices[0].message.content.trim();
        } catch (openAIError) {
          console.error('OpenAI API Error:', openAIError.response ? openAIError.response.data : openAIError.message);
          return; // No enviar respuesta 500 ya que ya se envió la respuesta 200 al cliente
        }

        console.info(`Received Response: ${responseContent}`);

        // Actualizar el título del post en WordPress
        try {
          const wpEndpoint = `${process.env.WORDPRESS_API_URL}/appraisals/${post_id}`;
          const authHeader = 'Basic ' + Buffer.from(`${encodeURIComponent(process.env.WORDPRESS_USERNAME)}:${process.env.WORDPRESS_APP_PASSWORD.trim()}`).toString('base64');

          // Actualizar el título del post
          const updateResponse = await fetch(wpEndpoint, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader,
            },
            body: JSON.stringify({
              title: responseContent,
            }),
          });

          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error(`[update-pending-appraisal] Error actualizando título del post en WordPress: ${errorText}`);
            // Manejar el error según sea necesario
          } else {
            console.log(`Título del post de WordPress actualizado exitosamente con la descripción generada.`);
          }
        } catch (error) {
          console.error('Error actualizando el título del post en WordPress:', error);
          // Manejar el error según sea necesario
        }

        // Guardar el array de imágenes y la descripción en el spreadsheet, y obtener 'customer_name' de columna E
        try {
          // Encontrar la fila en Google Sheets que coincide con el customer_email
          const spreadsheetId = config.PENDING_APPRAISALS_SPREADSHEET_ID;
          const sheetName = config.GOOGLE_SHEET_NAME;

          const responseSheets = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A:O`, // Obtener columnas A hasta O
          });

          const values = responseSheets.data.values || [];
          let rowIndex = null;

          for (let i = 0; i < values.length; i++) {
            const rowCustomerEmail = values[i][3]; // Suponiendo que customer_email está en la columna D (índice 3)
            if (rowCustomerEmail === customer_email) {
              rowIndex = i + 1; // Las filas en Sheets comienzan en 1
              customer_name = values[i][4] || ''; // Suponiendo que customer_name está en la columna E (índice 4)
              break;
            }
          }

          if (rowIndex === null) {
            console.error(`Cloud Run: No se encontró el email del cliente ${customer_email} en Google Sheets.`);
            return;
          }

          // Loguear el nombre del cliente obtenido
          console.log(`Cloud Run: Nombre del cliente obtenido de Google Sheets: ${customer_name}`);

          // Convertir el array de imágenes a una cadena JSON
          const imagesString = JSON.stringify(images);

          // Escribir la descripción en la columna H
          const descriptionRange = `${sheetName}!H${rowIndex}`;
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: descriptionRange,
            valueInputOption: 'USER_ENTERED',
            resource: {
              values: [[responseContent]],
            },
          });
          console.log(`Cloud Run: Descripción guardada en la fila ${rowIndex}, columna H.`);

          // Escribir el array de imágenes en la columna O
          const imagesRange = `${sheetName}!O${rowIndex}`;
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: imagesRange,
            valueInputOption: 'USER_ENTERED',
            resource: {
              values: [[imagesString]],
            },
          });
          console.log(`Cloud Run: Array de imágenes guardado en la fila ${rowIndex}, columna O.`);
        } catch (error) {
          console.error('Error guardando datos en Google Sheets:', error);
          // Manejar el error según sea necesario
        }

        // Enviar email al cliente con la descripción
        try {
          const sgMail = require('@sendgrid/mail');
          sgMail.setApiKey(process.env.SENDGRID_API_KEY);

          const msg = {
            to: customer_email,
            from: process.env.SENDGRID_EMAIL,
            templateId: process.env.SENDGRID_TEMPLATE_ID, // Asegúrate de definir este ID en tu configuración
            dynamic_template_data: {
              customer_name: customer_name,             // Coincide con {{customer_name}}
              description: responseContent,             // Coincide con {{description}}
              preliminary_description: description,     // Coincide con {{preliminary_description}}
              customer_email: customer_email,           // Coincide con {{customer_email}}
              current_year: new Date().getFullYear(),   // Coincide con {{current_year}}
              // Otros datos dinámicos si tu plantilla los requiere
            },
          };

          await sgMail.send(msg);
          console.log(`Email enviado exitosamente a ${customer_email} con la descripción.`);
        } catch (error) {
          console.error('Error enviando email al cliente:', error);
          // Manejar el error según sea necesario
        }

        // Continuar con otras operaciones si es necesario

      } catch (error) {
        console.error('Cloud Run: Error en /api/update-pending-appraisal:', error);
        // Manejar errores si es necesario
      }
    })();
  } catch (error) {
    console.error('Cloud Run: Error en /api/update-pending-appraisal:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
});



    

    // **Endpoint: Actualizar un Campo ACF Específico**
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
            'Authorization': authHeader,
          },
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
            'Authorization': authHeader,
          },
          body: JSON.stringify({ acf: acfFields }),
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

    // **Endpoint: Actualizar appraisalValue y/o description**
    app.post('/api/appraisals/:id/set-value', authenticate, validateSetValueData, async (req, res) => {
      const { id } = req.params;
      const { appraisalValue, description, isEdit } = req.body; // Añadimos isEdit

      try {
        // Determinar el nombre de la hoja basada en isEdit
        let sheetName = config.SHEET_NAME; // Por defecto

        if (isEdit) {
          sheetName = config.EDIT_SHEET_NAME;
        }

        await appraisalSteps.setAppraisalValue(id, appraisalValue, description, sheetName);
        res.json({ success: true, message: 'Appraisal updated successfully in Google Sheets and WordPress.' });
      } catch (error) {
        console.error('Error in set-value endpoint:', error);
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // **Endpoint: Completar el Proceso de la Apreciación (Encolado en Pub/Sub)**
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
            'Authorization': `Basic ${Buffer.from(`${encodeURIComponent(process.env.WORDPRESS_USERNAME)}:${process.env.WORDPRESS_APP_PASSWORD.trim()}`).toString('base64')}`,
          },
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

    // **Endpoint: Guardar Enlaces PDF y Doc en Google Sheets**
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
          iaDescription: row[7] || '', // Columna H: Descripción de AI
        }));

        console.log(`Total de apreciaciones completadas mapeadas: ${completedAppraisals.length}`);
        res.json(completedAppraisals);
      } catch (error) {
        console.error('Error obteniendo apreciaciones completadas:', error);
        res.status(500).json({ success: false, message: 'Error obteniendo apreciaciones completadas.' });
      }
    });

    // **Endpoint: Insertar Template en el Post de WordPress**
    app.post('/api/appraisals/:id/insert-template', authenticate, async (req, res) => {
      const { id } = req.params;

      try {
        await appraisalSteps.insertTemplate(id);
        res.json({ success: true, message: 'Shortcodes inserted successfully in WordPress post.' });
      } catch (error) {
        console.error('Error inserting shortcodes in WordPress:', error);
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // **Endpoint: Actualizar Título del Post de WordPress**
    app.post('/api/appraisals/:id/update-title', authenticate, async (req, res) => {
      const { id } = req.params;

      try {
        await appraisalSteps.updatePostTitle(id);
        res.json({ success: true, message: 'WordPress post title updated successfully.' });
      } catch (error) {
        console.error('Error updating post title in WordPress:', error);
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // **Endpoint: Enviar Email al Cliente**
    app.post('/api/appraisals/:id/send-email', authenticate, async (req, res) => {
      const { id } = req.params;

      try {
        await appraisalSteps.sendEmailToCustomer(id);
        res.json({ success: true, message: 'Email sent to customer successfully.' });
      } catch (error) {
        console.error('Error sending email to customer:', error);
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // **Endpoint: Actualizar los Enlaces PDF y Doc en Google Sheets desde WordPress**
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
            'Authorization': authHeader,
          },
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

    // **Endpoint: Completar la Apreciación**
    app.post('/api/appraisals/:id/complete', authenticate, async (req, res) => {
      const { id } = req.params;
      const { appraisalValue, description } = req.body;

      if (appraisalValue === undefined || description === undefined) {
        return res.status(400).json({ success: false, message: 'Appraisal Value and description are required.' });
      }

      try {
        await appraisalSteps.markAppraisalAsCompleted(id, appraisalValue, description);
        res.json({ success: true, message: 'Appraisal completed successfully.' });
      } catch (error) {
        console.error('Error completing the appraisal:', error);
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

// Ejecutar la IIFE para inicializar la configuración y el servidor
(async () => {
  try {
    await initializeConfig();
    await startServer();
  } catch (error) {
    console.error('Error en la inicialización:', error);
    process.exit(1);
  }
})();
