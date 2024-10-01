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

// Al construir las credenciales para el header de autorización
const username = encodeURIComponent(WORDPRESS_USERNAME);
const password = WORDPRESS_APP_PASSWORD; // No elimines espacios internos
const credentials = `${username}:${password}`;
const base64Credentials = Buffer.from(credentials).toString('base64');
const authHeader = 'Basic ' + base64Credentials;

// Usar el authHeader en la solicitud fetch
const wpUpdateResponse = await fetch(updateWpEndpoint, {
  method: 'POST',
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

    // index.js (Backend)

// Importaciones y configuraciones existentes...

 // **Endpoint: Merge Descriptions with OpenAI**
    app.post('/api/appraisals/:id/merge-descriptions', authenticate, async (req, res) => {
      const { id } = req.params;
      const { appraiserDescription, iaDescription } = req.body;

      // Validación de las descripciones recibidas
      if (!appraiserDescription || !iaDescription) {
        return res.status(400).json({ success: false, message: 'Appraiser description and IA description are required.' });
      }

      try {
        // Preparar la solicitud a OpenAI GPT-4 Chat API
        const openAIEndpoint = 'https://api.openai.com/v1/chat/completions';

        const openAIRequestBody = {
          model: 'gpt-4', // Utiliza el modelo de chat GPT-4
          messages: [
            {
              role: 'system',
              content: 'You are an assistant that merges appraiser and AI descriptions into a cohesive paragraph.'
            },
            {
              role: 'user',
              content: `Appraiser Description: ${appraiserDescription}\nAI Description: ${iaDescription}\n\nPlease merge the above descriptions into a cohesive paragraph.`
            }
          ],
          max_tokens: 150,
          temperature: 0.7
        };

        // Realizar llamada a OpenAI GPT-4 Chat API
        const openAIResponse = await fetch(openAIEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}` // Usar la clave de OpenAI desde el Secret Manager
          },
          body: JSON.stringify(openAIRequestBody)
        });

        // Manejo de errores de la respuesta de OpenAI
        if (!openAIResponse.ok) {
          const errorDetails = await openAIResponse.text();
          console.error('Error response from OpenAI:', errorDetails);
          throw new Error('Error merging descriptions with OpenAI.');
        }

        const openAIData = await openAIResponse.json();

        // Validar la estructura de la respuesta de OpenAI
        if (!openAIData.choices || !openAIData.choices[0].message || !openAIData.choices[0].message.content) {
          throw new Error('Invalid response structure from OpenAI.');
        }

        const blendedDescription = openAIData.choices[0].message.content.trim();

        console.log('Blended Description:', blendedDescription);

        // Responder al frontend con la descripción unificada
        res.json({ success: true, blendedDescription });
      } catch (error) {
        console.error('Error merging descriptions with OpenAI:', error);
        res.status(500).json({ success: false, message: 'Error merging descriptions with OpenAI.' });
      }
    });


// **Endpoint: Update Post Title in WordPress**
app.post('/api/appraisals/:id/update-title', authenticate, async (req, res) => {
  const { id } = req.params;
  const { newTitle } = req.body;

  if (!newTitle) {
    return res.status(400).json({ success: false, message: 'New title is required.' });
  }

  try {
    // Obtener detalles de la apreciación para obtener la URL de WordPress
    const appraisalResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${id}:I${id}`,
    });

    const appraisalRow = appraisalResponse.data.values ? appraisalResponse.data.values[0] : null;

    if (!appraisalRow) {
      return res.status(404).json({ success: false, message: 'Appraisal not found for updating in WordPress.' });
    }

    const appraisalWordpressUrl = appraisalRow[6] || ''; // Columna G: WordPress URL

    if (!appraisalWordpressUrl) {
      return res.status(400).json({ success: false, message: 'WordPress URL not provided.' });
    }

    const parsedWpUrl = new URL(appraisalWordpressUrl);
    const wpPostId = parsedWpUrl.searchParams.get('post');

    if (!wpPostId) {
      return res.status(400).json({ success: false, message: 'Could not extract WordPress post ID.' });
    }

    // **Actualizar el Título del Post en WordPress**
    const updateWpEndpoint = `${process.env.WORDPRESS_API_URL}/appraisals/${wpPostId}`;

    const updateData = {
      title: newTitle
    };

    const username = encodeURIComponent(process.env.WORDPRESS_USERNAME);
    const password = process.env.WORDPRESS_APP_PASSWORD; // Asegúrate de que no haya espacios adicionales
    const credentials = `${username}:${password}`;
    const base64Credentials = Buffer.from(credentials).toString('base64');
    const authHeader = 'Basic ' + base64Credentials;

    const wpUpdateResponse = await fetch(updateWpEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(updateData)
    });

    if (!wpUpdateResponse.ok) {
      const errorText = await wpUpdateResponse.text();
      console.error('Error updating WordPress:', errorText);
      throw new Error('Error updating WordPress post title.');
    }

    res.json({ success: true, message: 'WordPress post title updated successfully.' });
  } catch (error) {
    console.error('Error updating post title in WordPress:', error);
    res.status(500).json({ success: false, message: 'Error updating post title in WordPress.' });
  }
});

// **Endpoint: Insert WordPress Template**
app.post('/api/appraisals/:id/insert-template', authenticate, async (req, res) => {
  const { id } = req.params;
  const { templateId } = req.body;

  if (!templateId) {
    return res.status(400).json({ success: false, message: 'Template ID is required.' });
  }

  try {
    // Obtener detalles de la apreciación para obtener la URL de WordPress
    const appraisalResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${id}:I${id}`,
    });

    const appraisalRow = appraisalResponse.data.values ? appraisalResponse.data.values[0] : null;

    if (!appraisalRow) {
      return res.status(404).json({ success: false, message: 'Appraisal not found for inserting template in WordPress.' });
    }

    const appraisalWordpressUrl = appraisalRow[6] || ''; // Columna G: WordPress URL

    if (!appraisalWordpressUrl) {
      return res.status(400).json({ success: false, message: 'WordPress URL not provided.' });
    }

    const parsedWpUrl = new URL(appraisalWordpressUrl);
    const wpPostId = parsedWpUrl.searchParams.get('post');

    if (!wpPostId) {
      return res.status(400).json({ success: false, message: 'Could not extract WordPress post ID.' });
    }

    // **Insertar la Plantilla en el Post de WordPress**
    const insertTemplateEndpoint = `${process.env.WORDPRESS_API_URL}/appraisals/${wpPostId}/blocks`;

    const insertData = {
      block: {
        name: 'your-plugin/your-block', // Reemplaza con el nombre de tu bloque
        attributes: {
          templateId: templateId
        }
      }
    };

    const username = encodeURIComponent(process.env.WORDPRESS_USERNAME);
    const password = process.env.WORDPRESS_APP_PASSWORD; // Asegúrate de que no haya espacios adicionales
    const credentials = `${username}:${password}`;
    const base64Credentials = Buffer.from(credentials).toString('base64');
    const authHeader = 'Basic ' + base64Credentials;

    const wpInsertResponse = await fetch(insertTemplateEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(insertData)
    });

    if (!wpInsertResponse.ok) {
      const errorText = await wpInsertResponse.text();
      console.error('Error inserting template in WordPress:', errorText);
      throw new Error('Error inserting WordPress template.');
    }

    res.json({ success: true, message: 'WordPress template inserted successfully.' });
  } catch (error) {
    console.error('Error inserting template in WordPress:', error);
    res.status(500).json({ success: false, message: 'Error inserting template in WordPress.' });
  }
});

// **Endpoint: Send Email to Customer**
app.post('/api/appraisals/:id/send-email', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    // Obtener detalles de la apreciación
    const appraisalResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${id}:I${id}`,
    });

    const appraisalRow = appraisalResponse.data.values ? appraisalResponse.data.values[0] : null;

    if (!appraisalRow) {
      return res.status(404).json({ success: false, message: 'Appraisal not found for sending email.' });
    }

    const customerEmail = appraisalRow[4] || ''; // Supongamos que la columna E contiene el correo electrónico del cliente

    if (!customerEmail) {
      return res.status(400).json({ success: false, message: 'Customer email not provided.' });
    }

    // **Enviar Email usando SendGrid**
    const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: customerEmail }],
          subject: 'Your Appraisal is Complete'
        }],
        from: { email: 'no-reply@appraisily.com', name: 'Appraisily' },
        content: [{
          type: 'text/plain',
          value: 'Dear Customer,\n\nYour appraisal has been completed. Please check your account for more details.\n\nBest regards,\nAppraisily Team'
        }]
      })
    });

    if (!sendGridResponse.ok) {
      const errorText = await sendGridResponse.text();
      console.error('Error sending email via SendGrid:', errorText);
      throw new Error('Error sending email to customer.');
    }

    res.json({ success: true, message: 'Email sent to customer successfully.' });
  } catch (error) {
    console.error('Error sending email to customer:', error);
    res.status(500).json({ success: false, message: 'Error sending email to customer.' });
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
