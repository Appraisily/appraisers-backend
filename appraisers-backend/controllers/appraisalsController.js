// controllers/appraisalsController.js

const { google } = require('googleapis');
const fetch = require('node-fetch');
const https = require('https');
const appraisalStepsModule = require('../shared/appraisalSteps');
const { initializeSheets } = require('../shared/googleSheets');
const getImageUrl = require('../utils/getImageUrl');
const { PubSub } = require('@google-cloud/pubsub');
const validateSetValueData = require('../utils/validateSetValueData');

// Configure fetch to use Node.js HTTPS module with proper SSL settings
const agent = new https.Agent({
  rejectUnauthorized: false,
  secureProtocol: 'TLSv1_2_method'
});

// Helper function to fix WordPress URL
const fixWordPressUrl = (url) => {
  if (!url) return url;
  return url.replace('www.resources.appraisily.com', 'resources.appraisily.com');
};

exports.getAppraisals = async (req, res) => {
  try {
    const { config } = require('../shared/config');
    const SPREADSHEET_ID = config.PENDING_APPRAISALS_SPREADSHEET_ID;
    const SHEET_NAME = config.GOOGLE_SHEET_NAME;

    if (!SPREADSHEET_ID || !SHEET_NAME) {
      console.error('SPREADSHEET_ID o SHEET_NAME no están definidos en config.');
      return res.status(500).json({ success: false, message: 'Error de configuración del servidor.' });
    }

    const sheets = await initializeSheets();

    console.log('SPREADSHEET_ID:', SPREADSHEET_ID);
    console.log('SHEET_NAME:', SHEET_NAME);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:H`,
    });

    const rows = response.data.values || [];
    console.log(`Total de filas obtenidas: ${rows.length}`);

    const appraisals = rows.map((row, index) => ({
      id: index + 2,
      date: row[0] || '',
      appraisalType: row[1] || '',
      identifier: row[2] || '',
      status: row[5] || '',
      wordpressUrl: row[6] || '',
      iaDescription: row[7] || '',
    }));

    console.log(`Total de apreciaciones mapeadas: ${appraisals.length}`);
    res.json(appraisals);
  } catch (error) {
    console.error('Error obteniendo apreciaciones:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo apreciaciones.' });
  }
};

exports.getAppraisalDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const { config } = require('../shared/config');
    const SPREADSHEET_ID = config.PENDING_APPRAISALS_SPREADSHEET_ID;
    const SHEET_NAME = config.GOOGLE_SHEET_NAME;
    const sheets = await initializeSheets();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${id}:I${id}`,
    });

    const row = response.data.values ? response.data.values[0] : null;

    if (!row) {
      return res.status(404).json({ success: false, message: 'Apreciación no encontrada.' });
    }

    const appraisal = {
      id: id,
      date: row[0] || '',
      appraisalType: row[1] || '',
      identifier: row[2] || '',
      status: row[5] || '',
      wordpressUrl: row[6] || '',
      iaDescription: row[7] || '',
      customerDescription: row[8] || '',
    };

    const wordpressUrl = appraisal.wordpressUrl;
    const parsedUrl = new URL(wordpressUrl);
    const postId = parsedUrl.searchParams.get('post');

    if (!postId) {
      return res.status(400).json({ success: false, message: 'No se pudo extraer el ID del post de WordPress.' });
    }

    console.log(`[getAppraisalDetails] Post ID extraído: ${postId}`);

    const wpEndpoint = `${fixWordPressUrl(config.WORDPRESS_API_URL)}/appraisals/${postId}`;
    console.log(`[getAppraisalDetails] Endpoint de WordPress: ${wpEndpoint}`);

    const authHeader = 'Basic ' + Buffer.from(`${encodeURIComponent(config.WORDPRESS_USERNAME)}:${config.WORDPRESS_APP_PASSWORD.trim()}`).toString('base64');

    const wpResponse = await fetch(wpEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      agent
    });

    if (!wpResponse.ok) {
      const errorText = await wpResponse.text();
      console.error(`[getAppraisalDetails] Error obteniendo post de WordPress: ${errorText}`);
      return res.status(500).json({ success: false, message: 'Error obteniendo datos de WordPress.' });
    }

    const wpData = await wpResponse.json();
    console.log(`[getAppraisalDetails] Datos de WordPress obtenidos:`, wpData);

    const acfFields = wpData.acf || {};

    const images = {
      main: await getImageUrl(acfFields.main),
      age: await getImageUrl(acfFields.age),
      signature: await getImageUrl(acfFields.signature),
    };

    appraisal.images = images;

    res.json(appraisal);
  } catch (error) {
    console.error('Error obteniendo detalles de la apreciación:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo detalles de la apreciación.' });
  }
};

exports.getAppraisalDetailsForEdit = async (req, res) => {
  const { id } = req.params;

  try {
    const { config } = require('../shared/config');
    const SPREADSHEET_ID = config.PENDING_APPRAISALS_SPREADSHEET_ID;
    const SHEET_NAME = config.GOOGLE_SHEET_NAME;
    const sheets = await initializeSheets();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${id}:I${id}`,
    });

    const row = response.data.values ? response.data.values[0] : null;

    if (!row) {
      return res.status(404).json({ success: false, message: 'Apreciación no encontrada.' });
    }

    const appraisal = {
      id: id,
      date: row[0] || '',
      appraisalType: row[1] || '',
      identifier: row[2] || '',
      status: row[5] || '',
      wordpressUrl: row[6] || '',
      iaDescription: row[7] || '',
      customerDescription: row[8] || '',
    };

    const wordpressUrl = appraisal.wordpressUrl;
    let postId = '';

    try {
      const parsedUrl = new URL(wordpressUrl);
      postId = parsedUrl.searchParams.get('post');
      console.log(`[getAppraisalDetailsForEdit] Post ID extraído: ${postId}`);
    } catch (error) {
      console.error(`[getAppraisalDetailsForEdit] Error al parsear la URL de WordPress: ${error}`);
      return res.status(400).json({ success: false, message: 'URL de WordPress inválida.' });
    }

    if (!postId || isNaN(postId)) {
      console.error(`[getAppraisalDetailsForEdit] Post ID de WordPress no proporcionado o inválido en la URL.`);
      return res.status(400).json({ success: false, message: 'Post ID de WordPress no proporcionado o inválido.' });
    }

    const wpEndpoint = `${fixWordPressUrl(config.WORDPRESS_API_URL)}/appraisals/${postId}`;
    console.log(`[getAppraisalDetailsForEdit] Endpoint de WordPress: ${wpEndpoint}`);

    const authHeader = 'Basic ' + Buffer.from(`${encodeURIComponent(config.WORDPRESS_USERNAME)}:${config.WORDPRESS_APP_PASSWORD.trim()}`).toString('base64');

    const wpResponse = await fetch(wpEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      agent
    });

    if (!wpResponse.ok) {
      const errorText = await wpResponse.text();
      console.error(`[getAppraisalDetailsForEdit] Error obteniendo post de WordPress: ${errorText}`);
      return res.status(500).json({ success: false, message: 'Error obteniendo datos de WordPress.' });
    }

    const wpData = await wpResponse.json();
    console.log(`[getAppraisalDetailsForEdit] Datos de WordPress obtenidos:`, wpData);

    const acfFields = wpData.acf || {};

    const images = {
      main: await getImageUrl(acfFields.main),
      age: await getImageUrl(acfFields.age),
      signature: await getImageUrl(acfFields.signature),
    };

    appraisal.acfFields = acfFields;
    appraisal.images = images;

    res.json(appraisal);
  } catch (error) {
    console.error('Error obteniendo detalles de la apreciación (list-edit):', error);
    res.status(500).json({ success: false, message: 'Error obteniendo detalles de la apreciación.' });
  }
};

exports.updateAcfField = async (req, res) => {
  const { id } = req.params;
  const { fieldName, fieldValue } = req.body;

  if (!fieldName) {
    return res.status(400).json({ success: false, message: 'Field name is required.' });
  }

  try {
    const { config } = require('../shared/config');

    const wpEndpoint = `${fixWordPressUrl(config.WORDPRESS_API_URL)}/appraisals/${id}`;

    const authHeader = 'Basic ' + Buffer.from(`${encodeURIComponent(config.WORDPRESS_USERNAME)}:${config.WORDPRESS_APP_PASSWORD.trim()}`).toString('base64');

    const wpResponse = await fetch(wpEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      agent
    });

    if (!wpResponse.ok) {
      const errorText = await wpResponse.text();
      console.error(`[updateAcfField] Error obteniendo post de WordPress: ${errorText}`);
      return res.status(500).json({ success: false, message: 'Error fetching WordPress post.' });
    }

    const wpData = await wpResponse.json();
    const acfFields = wpData.acf || {};

    acfFields[fieldName] = fieldValue;

    const updateResponse = await fetch(wpEndpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({ acf: acfFields }),
      agent
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error(`[updateAcfField] Error actualizando ACF field: ${errorText}`);
      return res.status(500).json({ success: false, message: 'Error updating ACF field in WordPress.' });
    }

    res.json({ success: true, message: `Field '${fieldName}' updated successfully.` });
  } catch (error) {
    console.error('Error updating ACF field:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.setAppraisalValue = async (req, res) => {
  const { id } = req.params;
  const { appraisalValue, description, isEdit } = req.body;

  try {
    const { config } = require('../shared/config');
    const sheets = await initializeSheets();
    const appraisalSteps = appraisalStepsModule.appraisalSteps(sheets, config);

    let sheetName = config.GOOGLE_SHEET_NAME;

    if (isEdit) {
      sheetName = config.EDIT_SHEET_NAME;
    }

    await appraisalSteps.setAppraisalValue(id, appraisalValue, description, sheetName);
    res.json({ success: true, message: 'Appraisal updated successfully in Google Sheets and WordPress.' });
  } catch (error) {
    console.error('Error in setAppraisalValue:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.completeProcess = async (req, res) => {
  const { id } = req.params;
  const { appraisalValue, description } = req.body;

  if (!appraisalValue || !description) {
    return res.status(400).json({ success: false, message: 'Appraisal Value and description are required.' });
  }

  try {
    const { config } = require('../shared/config');
    const pubsub = new PubSub({
      projectId: config.GOOGLE_CLOUD_PROJECT_ID,
    });

    const task = {
      id,
      appraisalValue,
      description,
    };

    const dataBuffer = Buffer.from(JSON.stringify(task));

    await pubsub.topic('appraisal-tasks').publish(dataBuffer);

    console.log(`[completeProcess] Enqueued appraisal task for id: ${id}`);

    res.json({ success: true, message: 'Appraisal submitted successfully.' });
  } catch (error) {
    console.error(`Error encolando la apreciación ${id}:`, error);
    res.status(500).json({ success: false, message: `Error submitting appraisal: ${error.message}` });
  }
};

exports.getSessionId = async (req, res) => {
  const { postId } = req.body;

  if (!postId) {
    return res.status(400).json({ success: false, message: 'postId es requerido.' });
  }

  try {
    const { config } = require('../shared/config');

    const wpEndpoint = `${fixWordPressUrl(config.WORDPRESS_API_URL)}/appraisals/${postId}`;
    console.log(`[getSessionId] Endpoint de WordPress: ${wpEndpoint}`);

    const authHeader = 'Basic ' + Buffer.from(`${encodeURIComponent(config.WORDPRESS_USERNAME)}:${config.WORDPRESS_APP_PASSWORD.trim()}`).toString('base64');

    const wpResponse = await fetch(wpEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      agent
    });

    if (!wpResponse.ok) {
      const errorText = await wpResponse.text();
      console.error(`[getSessionId] Error obteniendo post de WordPress: ${errorText}`);
      return res.status(500).json({ success: false, message: 'Error obteniendo datos de WordPress.' });
    }

    const wpData = await wpResponse.json();
    const acfFields = wpData.acf || {};
    const session_ID = acfFields.session_id || '';

    if (!session_ID) {
      console.error(`[getSessionId] session_ID no encontrado en el post de WordPress.`);
      return res.status(404).json({ success: false, message: 'session_ID no encontrado en el post de WordPress.' });
    }

    console.log(`[getSessionId] session_ID extraído: ${session_ID}`);
    res.json({ success: true, session_ID });
  } catch (error) {
    console.error('Error obteniendo session_ID:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo session_ID.' });
  }
};

exports.saveLinks = async (req, res) => {
  const { id } = req.params;
  const { pdfLink, docLink } = req.body;

  if (!pdfLink || !docLink) {
    return res.status(400).json({ success: false, message: 'PDF Link y Doc Link son requeridos.' });
  }

  try {
    const { config } = require('../shared/config');
    const SPREADSHEET_ID = config.PENDING_APPRAISALS_SPREADSHEET_ID;
    const SHEET_NAME = config.GOOGLE_SHEET_NAME;
    const sheets = await initializeSheets();

    const updateRange = `${SHEET_NAME}!M${id}:N${id}`;
    const values = [[pdfLink, docLink]];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: updateRange,
      valueInputOption: 'RAW',
      resource: {
        values: values,
      },
    });

    console.log(`[saveLinks] Actualizadas las columnas M y N para la fila ${id} con PDF Link: ${pdfLink} y Doc Link: ${docLink}`);

    res.json({ success: true, message: 'PDF Link y Doc Link guardados exitosamente en Google Sheets.' });
  } catch (error) {
    console.error('Error guardando los links en Google Sheets:', error);
    res.status(500).json({ success: false, message: 'Error guardando los links en Google Sheets.' });
  }
};

exports.getCompletedAppraisals = async (req, res) => {
  try {
    const { config } = require('../shared/config');
    const sheets = await initializeSheets();

    const SPREADSHEET_ID = config.PENDING_APPRAISALS_SPREADSHEET_ID;
    const sheetName = 'Completed Appraisals';
    const range = `${sheetName}!A2:H`;
    console.log(`Fetching completed appraisals with range: ${range}`);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: range,
    });

    const rows = response.data.values || [];
    console.log(`Total de filas obtenidas (Completadas): ${rows.length}`);

    if (!Array.isArray(rows)) {
      console.error('La respuesta de Google Sheets no es un arreglo:', rows);
      throw new Error('La respuesta de Google Sheets no es un arreglo.');
    }

    rows.forEach((row, index) => {
      console.log(`Fila ${index + 2}:`, row);
    });

    const completedAppraisals = rows.map((row, index) => ({
      id: index + 2,
      date: row[0] || '',
      appraisalType: row[1] || '',
      identifier: row[2] || '',
      status: row[5] || '',
      wordpressUrl: row[6] || '',
      iaDescription: row[7] || '',
    }));

    console.log(`Total de apreciaciones completadas mapeadas: ${completedAppraisals.length}`);
    res.json(completedAppraisals);
  } catch (error) {
    console.error('Error obteniendo apreciaciones completadas:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo apreciaciones completadas.' });
  }
};

exports.insertTemplate = async (req, res) => {
  const { id } = req.params;

  try {
    const { config } = require('../shared/config');
    const sheets = await initializeSheets();
    const appraisalSteps = appraisalStepsModule.appraisalSteps(sheets, config);

    await appraisalSteps.insertTemplate(id);
    res.json({ success: true, message: 'Shortcodes inserted successfully in WordPress post.' });
  } catch (error) {
    console.error('Error inserting shortcodes in WordPress:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePostTitle = async (req, res) => {
  const { id } = req.params;

  try {
    const { config } = require('../shared/config');
    const sheets = await initializeSheets();
    const appraisalSteps = appraisalStepsModule.appraisalSteps(sheets, config);

    await appraisalSteps.updatePostTitle(id);
    res.json({ success: true, message: 'WordPress post title updated successfully.' });
  } catch (error) {
    console.error('Error updating post title in WordPress:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.sendEmailToCustomer = async (req, res) => {
  const { id } = req.params;

  try {
    const { config } = require('../shared/config');
    const sheets = await initializeSheets();
    const appraisalSteps = appraisalStepsModule.appraisalSteps(sheets, config);

    await appraisalSteps.sendEmailToCustomer(id);
    res.json({ success: true, message: 'Email sent to customer successfully.' });
  } catch (error) {
    console.error('Error sending email to customer:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateLinks = async (req, res) => {
  const { id } = req.params;
  const { postId } = req.body;

  if (!postId) {
    return res.status(400).json({ success: false, message: 'postId es requerido.' });
  }

  try {
    const { config } = require('../shared/config');
    const SPREADSHEET_ID = config.PENDING_APPRAISALS_SPREADSHEET_ID;
    const SHEET_NAME = config.GOOGLE_SHEET_NAME;
    const sheets = await initializeSheets();

    const wpEndpoint = `${fixWordPressUrl(config.WORDPRESS_API_URL)}/appraisals/${postId}`;
    console.log(`[updateLinks] Endpoint de WordPress: ${wpEndpoint}`);

    const credentialsString = `${encodeURIComponent(config.WORDPRESS_USERNAME)}:${config.WORDPRESS_APP_PASSWORD.trim()}`;
    const base64Credentials = Buffer.from(credentialsString).toString('base64');
    const authHeader = 'Basic ' + base64Credentials;

    const wpResponse = await fetch(wpEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      agent
    });

    if (!wpResponse.ok) {
      const errorText = await wpResponse.text();
      console.error(`[updateLinks] Error obteniendo post de WordPress: ${errorText}`);
      return res.status(500).json({ success: false, message: 'Error obteniendo datos de WordPress.' });
    }

    const wpData = await wpResponse.json();
    const acfFields = wpData.acf || {};

    const pdfLink = acfFields.pdflink || '';
    const docLink = acfFields.doclink || '';

    if (!pdfLink || !docLink) {
      console.error(`[updateLinks] Enlaces no encontrados en los campos ACF de WordPress.`);
      return res.status(404).json({
        success: false,
        message: 'Enlaces no encontrados en los campos ACF de WordPress.',
      });
    }

    const updateRange = `${SHEET_NAME}!M${id}:N${id}`;
    const values = [[pdfLink, docLink]];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: updateRange,
      valueInputOption: 'RAW',
      resource: {
        values: values,
      },
    });

    console.log(`[updateLinks] Actualizadas las columnas M y N para la fila ${id} con PDF Link: ${pdfLink} y Doc Link: ${docLink}`);

    res.json({ success: true, message: 'Enlaces actualizados exitosamente en Google Sheets.' });
  } catch (error) {
    console.error('Error actualizando los enlaces en Google Sheets:', error);
    res.status(500).json({ success: false, message: 'Error actualizando los enlaces en Google Sheets.' });
  }
};

exports.completeAppraisal = async (req, res) => {
  const { id } = req.params;
  const { appraisalValue, description } = req.body;

  if (appraisalValue === undefined || description === undefined) {
    return res.status(400).json({ success: false, message: 'Appraisal Value and description are required.' });
  }

  try {
    const { config } = require('../shared/config');
    const sheets = await initializeSheets();
    const appraisalSteps = appraisalStepsModule.appraisalSteps(sheets, config);

    await appraisalSteps.markAppraisalAsCompleted(id, appraisalValue, description);
    res.json({ success: true, message: 'Appraisal completed successfully.' });
  } catch (error) {
    console.error('Error completing the appraisal:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};