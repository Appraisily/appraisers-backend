// appraisalSteps.js

const fetch = require('node-fetch');
require('dotenv').config(); // Asegurarse de que las variables de entorno están cargadas

// Importar Google Sheets API
const { google } = require('googleapis');
const { config, initializeConfig } = require('./config'); // Asegúrate de que la ruta es correcta

// Variable global para sheets
let sheetsGlobal; // Declarar la variable global

// Función para inicializar Google Sheets y configuración
async function initialize() {
  try {
    await initializeConfig();

    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const authClient = await auth.getClient();
    sheetsGlobal = google.sheets({ version: 'v4', auth: authClient });
  } catch (error) {
    console.error('Error inicializando:', error);
    throw error;
  }
}

// Function: updateCurrentStepInSheet
async function updateCurrentStepInSheet(id, currentStep, sheetName = config.GOOGLE_SHEET_NAME) {
  console.log(`[updateCurrentStepInSheet] Called with id:`, id, `type:`, typeof id, `sheetName:`, sheetName);

  try {
    const updateRange = `${sheetName}!F${id}:F${id}`; // Column F
    const values = [[currentStep]];

    await sheetsGlobal.spreadsheets.values.update({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: updateRange,
      valueInputOption: 'RAW',
      resource: {
        values: values,
      },
    });

    console.log(`[updateCurrentStepInSheet] Updated column F for row ${id} with current step: ${currentStep}`);
  } catch (error) {
    console.error('Error updating current step in Google Sheets:', error);
    throw error;
  }
}

// Function: setAppraisalValue
async function setAppraisalValue(id, appraisalValue, description, sheetName = config.GOOGLE_SHEET_NAME) {
  console.log(`[setAppraisalValue] Called with id:`, id, `type:`, typeof id, `sheetName:`, sheetName);

  if (appraisalValue === undefined || description === undefined) {
    throw new Error('Appraisal Value and description are required.');
  }

  try {
    // Update the current step in the spreadsheet
    await updateCurrentStepInSheet(id, 'Set Appraisal Value', sheetName);

    // Update columns J and K in Google Sheets
    const updateRange = `${sheetName}!J${id}:K${id}`;
    const values = [[appraisalValue, description]];

    await sheetsGlobal.spreadsheets.values.update({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: updateRange,
      valueInputOption: 'RAW',
      resource: {
        values: values,
      },
    });

    console.log(
      `[setAppraisalValue] Updated columns J and K for row ${id} with Appraisal Value: ${appraisalValue} and Description: ${description}`
    );

    // Obtener detalles de la tasación para obtener la URL de WordPress
    const appraisalResponse = await sheetsGlobal.spreadsheets.values.get({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: `${config.GOOGLE_SHEET_NAME}!A${id}:I${id}`,
    });

    const appraisalRow = appraisalResponse.data.values ? appraisalResponse.data.values[0] : null;

    if (!appraisalRow) {
      throw new Error('Appraisal not found for updating in WordPress.');
    }

    const appraisalWordpressUrl = appraisalRow[6] || ''; // Column G: WordPress URL

    if (!appraisalWordpressUrl) {
      throw new Error('WordPress URL not provided.');
    }

    const parsedWpUrl = new URL(appraisalWordpressUrl);
    const wpPostId = parsedWpUrl.searchParams.get('post');

    if (!wpPostId) {
      throw new Error('Could not extract WordPress post ID.');
    }

    console.log(`[setAppraisalValue] Extracted Post ID: ${wpPostId}`);

    // Update the ACF 'value' field in WordPress
    const updateWpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${wpPostId}`;
    console.log(`[setAppraisalValue] WordPress update endpoint: ${updateWpEndpoint}`);

    const updateData = {
      acf: {
        value: appraisalValue, // Ensure 'value' is the correct ACF field name
      },
    };

    const credentialsString = `${encodeURIComponent(config.WORDPRESS_USERNAME)}:${config.WORDPRESS_APP_PASSWORD.trim()}`;
    const base64Credentials = Buffer.from(credentialsString).toString('base64');
    const authHeader = 'Basic ' + base64Credentials;
    console.log(`[setAppraisalValue] Authentication configured.`);

    const wpUpdateResponse = await fetch(updateWpEndpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(updateData),
    });

    if (!wpUpdateResponse.ok) {
      const errorText = await wpUpdateResponse.text();
      console.error(`[setAppraisalValue] Error updating WordPress: ${errorText}`);
      throw new Error('Error updating the ACF field in WordPress.');
    }

    console.log(`[setAppraisalValue] WordPress updated successfully.`);
  } catch (error) {
    console.error('Error in setAppraisalValue:', error);
    throw error;
  }
}

// Function: mergeDescriptions
async function mergeDescriptions(id, appraiserDescription) {
  const OPENAI_API_KEY = config.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not defined in environment variables.');
    throw new Error('Server configuration error. Please contact support.');
  }

  if (!appraiserDescription) {
    throw new Error('Appraiser description is required.');
  }

  try {
    // Update the current step in the spreadsheet
    await updateCurrentStepInSheet(id, 'Merge Descriptions');

    // Retrieve iaDescription from Google Sheets (Column H)
    const response = await sheetsGlobal.spreadsheets.values.get({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: `${config.GOOGLE_SHEET_NAME}!H${id}:H${id}`, // Column H: iaDescription
    });

    const iaDescription = response.data.values ? response.data.values[0][0] : null;

    if (!iaDescription) {
      throw new Error('IA description not found in Google Sheets.');
    }

    const maxTitleLength = 350; // Define el máximo de caracteres para el título en WordPress

    // Prepare the request to OpenAI GPT-4 Chat API for Merged Description
    const openAIRequestBody = {
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an assistant that merges appraiser and AI descriptions into a single, cohesive, and concise paragraph suitable for a WordPress title. The merged description should prefer the appraiser's description in case of any contradictions and must not exceed ${maxTitleLength} characters. Provide only the merged description without any additional text, introductions, or explanations.`,
        },
        {
          role: 'user',
          content: `Appraiser Description: ${appraiserDescription}\nAI Description: ${iaDescription}\n\nPlease merge the above descriptions into a single paragraph that prefers the appraiser's description in case of any contradictions and does not exceed ${maxTitleLength} characters. The output should contain only the merged description without any additional text.`,
        },
      ],
      max_tokens: Math.ceil(maxTitleLength / 4) + 10, // Ajuste flexible de tokens
      temperature: 0.7,
      n: 1,
      stop: null,
    };
    // Depurar el Request Body
    console.log('Request Body para OpenAI:', JSON.stringify(openAIRequestBody, null, 2));

    // Make the request to OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(openAIRequestBody),
    });

    if (!openAIResponse.ok) {
      const errorDetails = await openAIResponse.text();
      console.error('Error response from OpenAI:', errorDetails);
      throw new Error('Error merging descriptions with OpenAI.');
    }

    const openAIData = await openAIResponse.json();

    if (!openAIData.choices || !openAIData.choices[0].message || !openAIData.choices[0].message.content) {
      throw new Error('Invalid response structure from OpenAI.');
    }

    let blendedDescription = openAIData.choices[0].message.content.trim();

    console.log('Blended Description:', blendedDescription);

    // Update column L with blendedDescription
    const updateRange = `${config.GOOGLE_SHEET_NAME}!L${id}:L${id}`; // Column L
    const updateValues = [[blendedDescription]];

    await sheetsGlobal.spreadsheets.values.update({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: updateRange,
      valueInputOption: 'RAW',
      resource: {
        values: updateValues,
      },
    });

    console.log(`[mergeDescriptions] Updated column L for row ${id} with blendedDescription.`);
  } catch (error) {
    console.error('Error in mergeDescriptions:', error);
    throw error;
  }
}

// Function: updatePostTitle
async function updatePostTitle(id) {
  try {
    // Get appraisal details to obtain the WordPress URL and new title from Google Sheets
    const appraisalResponse = await sheetsGlobal.spreadsheets.values.get({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: `${config.GOOGLE_SHEET_NAME}!A${id}:L${id}`, // Adjust the range as needed
    });

    const appraisalRow = appraisalResponse.data.values ? appraisalResponse.data.values[0] : null;

    if (!appraisalRow) {
      throw new Error('Appraisal not found for updating in WordPress.');
    }

    const appraisalWordpressUrl = appraisalRow[6]?.trim() || ''; // Column G: WordPress URL
    const blendedDescription = appraisalRow[11] || ''; // Column L: Blended Description

    if (!appraisalWordpressUrl) {
      throw new Error('WordPress URL not provided.');
    }

    if (!blendedDescription) {
      throw new Error('Blended description not available.');
    }

    const newTitle = blendedDescription; // Usar la descripción completa como título

    const parsedWpUrl = new URL(appraisalWordpressUrl);
    const wpPostId = parsedWpUrl.searchParams.get('post');

    if (!wpPostId) {
      throw new Error('Could not extract WordPress post ID.');
    }

    console.log(`[updatePostTitle] Extracted Post ID: ${wpPostId}`);

    // Update the post title in WordPress
    const updateWpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${wpPostId}`;
    console.log(`[updatePostTitle] WordPress update endpoint: ${updateWpEndpoint}`);

    const updateData = {
      title: newTitle,
    };

    const credentialsString = `${encodeURIComponent(config.WORDPRESS_USERNAME)}:${config.WORDPRESS_APP_PASSWORD.trim()}`;
    const base64Credentials = Buffer.from(credentialsString).toString('base64');
    const authHeader = 'Basic ' + base64Credentials;

    console.log(`[updatePostTitle] Authentication configured.`);

    const wpUpdateResponse = await fetch(updateWpEndpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(updateData),
    });

    if (!wpUpdateResponse.ok) {
      const errorText = await wpUpdateResponse.text();
      console.error(`[updatePostTitle] Error updating WordPress: ${errorText}`);
      throw new Error('Error updating WordPress post title.');
    }

    const wpUpdateData = await wpUpdateResponse.json();
    await updateCurrentStepInSheet(id, 'Updating Post Title');

    console.log(`[updatePostTitle] WordPress post title updated successfully:`, wpUpdateData);

    return wpPostId; // Asegúrate de que retornas postId
  } catch (error) {
    console.error('Error in updatePostTitle:', error);
    throw error;
  }
}

// Function: insertTemplate
async function insertTemplate(id) {
  try {
    // Define the mapping of 'type' to 'template_id'
    const typeToTemplateIdMap = {
      RegularArt: 114984,
      PremiumArt: 137078,
      // Add more types as needed
    };

    // Get appraisal details to obtain the WordPress URL and Type
    const appraisalResponse = await sheetsGlobal.spreadsheets.values.get({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: `${config.GOOGLE_SHEET_NAME}!A${id}:K${id}`, // Adjust the range as needed
    });

    const appraisalRow = appraisalResponse.data.values ? appraisalResponse.data.values[0] : null;

    if (!appraisalRow) {
      throw new Error('Appraisal not found for inserting shortcodes in WordPress.');
    }

    const wordpressUrl = appraisalRow[6]?.trim() || ''; // Column G: WordPress URL
    let appraisalType = appraisalRow[1]?.trim() || 'RegularArt'; // Column B: Appraisal Type

    console.log(`[insertTemplate] WordPress URL: ${wordpressUrl}`);
    console.log(`[insertTemplate] Appraisal Type: ${appraisalType}`);

    const templateId = typeToTemplateIdMap[appraisalType] || typeToTemplateIdMap['RegularArt'];

    const parsedWpUrl = new URL(wordpressUrl);
    const wpPostId = parsedWpUrl.searchParams.get('post');

    if (!wpPostId || isNaN(wpPostId)) {
      throw new Error('Invalid WordPress post ID.');
    }

    console.log(`[insertTemplate] Extracted Post ID: ${wpPostId}`);

    const wpUsername = config.WORDPRESS_USERNAME;
    const wpAppPassword = config.WORDPRESS_APP_PASSWORD;

    if (!wpUsername || !wpAppPassword) {
      throw new Error('Missing WordPress credentials.');
    }

    const updateWpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${wpPostId}`;
    console.log(`[insertTemplate] WordPress update endpoint: ${updateWpEndpoint}`);

    const credentialsString = `${encodeURIComponent(wpUsername)}:${wpAppPassword.trim()}`;
    const base64Credentials = Buffer.from(credentialsString).toString('base64');
    const authHeader = 'Basic ' + base64Credentials;

    // Get the current post content
    const currentPostResponse = await fetch(updateWpEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
    });

    if (!currentPostResponse.ok) {
      const errorText = await currentPostResponse.text();
      console.error(`[insertTemplate] Error fetching current post from WordPress: ${errorText}`);
      throw new Error('Error fetching current post from WordPress.');
    }

    const currentPostData = await currentPostResponse.json();
    const currentContent = currentPostData.content.rendered;
    const acfFields = currentPostData.acf || {};
    const shortcodesInserted = acfFields.shortcodes_inserted || false;

    if (shortcodesInserted) {
      console.log(`[insertTemplate] Shortcodes already inserted according to ACF flag.`);
      return;
    }

    let updatedContent = currentContent;

    if (!currentContent.includes('[pdf_download]')) {
      updatedContent += '\n[pdf_download]';
    }

    if (!currentContent.includes(`[AppraisalTemplates type="${appraisalType}"]`)) {
      updatedContent += `\n[AppraisalTemplates type="${appraisalType}"]`;
    }

    console.log(`[insertTemplate] Updated content:`, updatedContent);

    // Update the post with the new content
    const updatePostResponse = await fetch(updateWpEndpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        content: updatedContent,
      }),
    });

    if (!updatePostResponse.ok) {
      const errorText = await updatePostResponse.text();
      console.error(`[insertTemplate] Error updating WordPress post: ${errorText}`);
      throw new Error('Error updating WordPress post.');
    }
    await updateCurrentStepInSheet(id, 'Template Inserted');

    console.log(`[insertTemplate] Shortcodes inserted successfully in WordPress post.`);

    // Update the ACF flag
    await updateShortcodesFlag(wpPostId, authHeader);
  } catch (error) {
    console.error('Error in insertTemplate:', error);
    throw error;
  }
}

// Function: updateShortcodesFlag
async function updateShortcodesFlag(wpPostId, authHeader) {
  const updateWpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${wpPostId}`;
  console.log(`[updateShortcodesFlag] Updating ACF flag for post ID: ${wpPostId}`);

  const updateFlagResponse = await fetch(updateWpEndpoint, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({
      acf: {
        shortcodes_inserted: true,
      },
    }),
  });

  if (!updateFlagResponse.ok) {
    const errorText = await updateFlagResponse.text();
    console.error(`[updateShortcodesFlag] Error updating ACF flag: ${errorText}`);
    throw new Error('Error updating ACF flag.');
  }

  const updateFlagData = await updateFlagResponse.json();
  console.log(`[updateShortcodesFlag] ACF flag updated successfully:`, updateFlagData);
}

// Función: completarTasacion (Paso 5)
async function completarTasacion(postId, id) {
  console.log(`[completarTasacion] Called for Post ID: ${postId}`);

  try {
    // Configurar un controlador para manejar el tiempo de espera
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 600000); // 600,000 ms = 10 minutos

    const response = await fetch('https://appraisals-backend-856401495068.us-central1.run.app/complete-appraisal-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ postId }),
      signal: controller.signal, // Pasar el controlador de señal a fetch
    });

    clearTimeout(timeout); // Limpiar el timeout si la solicitud se completa

    const text = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(text);
    } catch (e) {
      console.error('Response is not valid JSON:', text);
      throw new Error(`Unexpected response format: ${text}`);
    }

    if (!response.ok) {
      throw new Error(responseData.message || 'Error completing appraisal report.');
    }

    // Actualizar el paso actual en Google Sheets
    await updateCurrentStepInSheet(id, 'Appraisal Text Filled');
    console.log(`[completarTasacion] Completed appraisal report for Post ID: ${postId}`);
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Request timed out:', error);
      throw new Error('La solicitud excedió el tiempo de espera. Por favor, inténtalo de nuevo más tarde.');
    } else {
      console.error('Error in completarTasacion:', error);
      throw error;
    }
  }
}


// Function: buildPDF
async function buildPDF(id) {
  try {
    // Get appraisal details from Google Sheets to obtain the WordPress URL
    const appraisalResponse = await sheetsGlobal.spreadsheets.values.get({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: `${config.GOOGLE_SHEET_NAME}!A${id}:N${id}`, // Adjust the range as needed
    });

    const appraisalRow = appraisalResponse.data.values ? appraisalResponse.data.values[0] : null;

    if (!appraisalRow) {
      throw new Error('Appraisal not found for PDF generation.');
    }

    const wordpressUrl = appraisalRow[6]?.trim() || ''; // Column G: WordPress URL

    if (!wordpressUrl) {
      throw new Error('WordPress URL is missing.');
    }

    // Extract postId from the WordPress URL
    const parsedUrl = new URL(wordpressUrl);
    const postId = parsedUrl.searchParams.get('post');

    if (!postId) {
      throw new Error('Invalid WordPress URL: Post ID not found.');
    }

    // Get session_ID
    const session_ID = await getSessionId(postId);

    if (!session_ID) {
      throw new Error('session_ID not found.');
    }

    // Request PDF generation with postId and session_ID
    console.log(`[buildPDF] Requesting PDF generation with postId: ${postId} and session_ID: ${session_ID}`);
    const buildPdfResponse = await fetch('https://appraisals-backend-856401495068.us-central1.run.app/generate-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ postId: postId, session_ID: session_ID }),
    });

    const buildPdfData = await buildPdfResponse.json();

    if (!buildPdfData.success) {
      throw new Error(buildPdfData.message || 'Error building PDF.');
    }

    // Update the links in Google Sheets
    await updateLinks(id, postId);
    await updateCurrentStepInSheet(id, 'PDF built and links inserted');
    console.log('[buildPDF] Links updated in Google Sheets successfully.');
  } catch (error) {
    console.error('Error in buildPDF:', error);
    throw error;
  }
}

// Function: getSessionId
async function getSessionId(postId) {
  if (!postId) {
    throw new Error('postId is required.');
  }

  try {
    // Build WordPress endpoint to get the post
    const wpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${postId}`;
    console.log(`[getSessionId] WordPress Endpoint: ${wpEndpoint}`);

    // Authentication with WordPress
    const credentialsString = `${encodeURIComponent(config.WORDPRESS_USERNAME)}:${config.WORDPRESS_APP_PASSWORD.trim()}`;
    const base64Credentials = Buffer.from(credentialsString).toString('base64');
    const authHeader = 'Basic ' + base64Credentials;

    // Make GET request to WordPress REST API
    const wpResponse = await fetch(wpEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
    });

    if (!wpResponse.ok) {
      const errorText = await wpResponse.text();
      console.error(`[getSessionId] Error fetching post from WordPress: ${errorText}`);
      throw new Error('Error fetching data from WordPress.');
    }

    const wpData = await wpResponse.json();
    const acfFields = wpData.acf || {};
    const session_ID = acfFields.session_id || '';

    if (!session_ID) {
      console.error(`[getSessionId] session_ID not found in WordPress post.`);
      throw new Error('session_ID not found in WordPress post.');
    }

    console.log(`[getSessionId] Extracted session_ID: ${session_ID}`);
    return session_ID;
  } catch (error) {
    console.error('Error in getSessionId:', error);
    throw error;
  }
}

// Function: updateLinks
async function updateLinks(id, postId) {
  if (!postId) {
    throw new Error('postId is required.');
  }

  try {
    // Obtener los enlaces desde los campos ACF de WordPress
    const wpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${postId}`;
    console.log(`[updateLinks] WordPress Endpoint: ${wpEndpoint}`);

    // Autenticación con WordPress
    const credentialsString = `${encodeURIComponent(config.WORDPRESS_USERNAME)}:${config.WORDPRESS_APP_PASSWORD.trim()}`;
    const base64Credentials = Buffer.from(credentialsString).toString('base64');
    const authHeader = 'Basic ' + base64Credentials;

    // Obtener el post de WordPress
    const wpResponse = await fetch(wpEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
    });

    if (!wpResponse.ok) {
      const errorText = await wpResponse.text();
      console.error(`[updateLinks] Error fetching post from WordPress: ${errorText}`);
      throw new Error('Error fetching data from WordPress.');
    }

    const wpData = await wpResponse.json();
    const acfFields = wpData.acf || {};

    const pdfLink = acfFields.pdflink || '';
    const docLink = acfFields.doclink || '';

    if (!pdfLink || !docLink) {
      console.error(`[updateLinks] Links not found in ACF fields of WordPress.`);
      throw new Error('Links not found in ACF fields of WordPress.');
    }

    // Actualizar columnas M y N en Google Sheets
    const updateRange = `${config.GOOGLE_SHEET_NAME}!M${id}:N${id}`; // Columnas M y N
    const values = [[pdfLink, docLink]];

    await sheetsGlobal.spreadsheets.values.update({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: updateRange,
      valueInputOption: 'RAW',
      resource: {
        values: values,
      },
    });

    console.log(
      `[updateLinks] Updated columns M and N for row ${id} with PDF Link: ${pdfLink} y Doc Link: ${docLink}`
    );
  } catch (error) {
    console.error('Error in updateLinks:', error);
    throw error;
  }
}

// Function: sendEmailToCustomer
async function sendEmailToCustomer(id) {
  try {
    // Get appraisal details from Google Sheets
    const appraisalResponse = await sheetsGlobal.spreadsheets.values.get({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: `${config.GOOGLE_SHEET_NAME}!A${id}:N${id}`, // Include columns up to N to get PDF link
    });

    const appraisalRow = appraisalResponse.data.values ? appraisalResponse.data.values[0] : null;

    if (!appraisalRow) {
      throw new Error('Appraisal not found for sending email.');
    }

    const customerEmail = appraisalRow[3]?.trim() || ''; // Column D: Customer Email

    if (!customerEmail) {
      throw new Error('Customer email not provided.');
    }

    // Validate the customer's email format
    const isValidEmail = (email) => {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(String(email).toLowerCase());
    };

    if (!isValidEmail(customerEmail)) {
      throw new Error('Invalid customer email format.');
    }

    // Get the WordPress edit URL from Google Sheets
    const wordpressEditUrl = appraisalRow[6]?.trim() || ''; // Column G: WordPress URL

    if (!wordpressEditUrl) {
      throw new Error('WordPress URL not provided.');
    }

    // Extract wpPostId from the WordPress edit URL
    const parsedWpUrl = new URL(wordpressEditUrl);
    const wpPostId = parsedWpUrl.searchParams.get('post');

    if (!wpPostId) {
      throw new Error('Could not extract WordPress post ID.');
    }

    // Obtain the public URL of the post from the WordPress REST API
    const wpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${wpPostId}`;
    console.log(`[sendEmailToCustomer] WordPress API endpoint: ${wpEndpoint}`);

    const credentialsString = `${encodeURIComponent(config.WORDPRESS_USERNAME)}:${config.WORDPRESS_APP_PASSWORD.trim()}`;
    const base64Credentials = Buffer.from(credentialsString).toString('base64');
    const authHeader = 'Basic ' + base64Credentials;

    // Fetch post data from WordPress
    const wpResponse = await fetch(wpEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
    });

    if (!wpResponse.ok) {
      const errorText = await wpResponse.text();
      console.error(`[sendEmailToCustomer] Error fetching post from WordPress: ${errorText}`);
      throw new Error('Error fetching post from WordPress.');
    }

    const wpData = await wpResponse.json();
    const publicUrl = wpData.link;

    if (!publicUrl) {
      throw new Error('Public URL not found in WordPress post data.');
    }

    const pdfLink = appraisalRow[12]?.trim() || ''; // Column M: PDF Link

    const customerDashboardLink = `https://www.appraisily.com/dashboard/?email=${encodeURIComponent(customerEmail)}`;

    const SENDGRID_API_KEY = config.SENDGRID_API_KEY;
    const SENDGRID_EMAIL = config.SENDGRID_EMAIL;

    if (!SENDGRID_API_KEY || !SENDGRID_EMAIL) {
      throw new Error('Missing SendGrid credentials.');
    }

    // Define your SendGrid template ID
    const templateId = config.SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED;

    // Send Email using SendGrid with the template
    const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: customerEmail }],
            dynamic_template_data: {
              appraisal_link: publicUrl,
              pdf_link: pdfLink,
              dashboard_link: customerDashboardLink,
              // Include other dynamic data as needed
            },
          },
        ],
        from: { email: SENDGRID_EMAIL, name: 'Appraisily' },
        template_id: templateId,
      }),
    });

    if (!sendGridResponse.ok) {
      const errorText = await sendGridResponse.text();
      console.error(`[sendEmailToCustomer] Error sending email via SendGrid: ${errorText}`);
      throw new Error('Error sending email to customer.');
    }
    await updateCurrentStepInSheet(id, 'Email sent');

    console.log(`[sendEmailToCustomer] Email successfully sent to: ${customerEmail}`);
  } catch (error) {
    console.error('Error in sendEmailToCustomer:', error);
    throw error;
  }
}

// Function: markAppraisalAsCompleted
async function markAppraisalAsCompleted(id, appraisalValue, description) {
  try {
    // Update the current step in the spreadsheet
    await updateCurrentStepInSheet(id, 'Completed');

    // Update columns J and K with the provided data
    const updateRange = `${config.GOOGLE_SHEET_NAME}!J${id}:K${id}`;
    const values = [[appraisalValue, description]];

    await sheetsGlobal.spreadsheets.values.update({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: updateRange,
      valueInputOption: 'RAW',
      resource: {
        values: values,
      },
    });

    // Update the status to "Completed" in column F
    const statusUpdateRange = `${config.GOOGLE_SHEET_NAME}!F${id}:F${id}`;
    const statusValues = [['Completed']];

    await sheetsGlobal.spreadsheets.values.update({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: statusUpdateRange,
      valueInputOption: 'RAW',
      resource: {
        values: statusValues,
      },
    });

    console.log(`[markAppraisalAsCompleted] Appraisal ID ${id} marked as completed.`);
    await updateCurrentStepInSheet(id, 'Completed');
  } catch (error) {
    console.error('Error in markAppraisalAsCompleted:', error);
    throw error;
  }
}

// Function: processAppraisal
async function processAppraisal(id, appraisalValue, description, resume = false) {
  try {
    console.log(`[processAppraisal] Starting process for Appraisal ID: ${id}`);

    // Definir los pasos en orden
    const steps = [
      { name: 'Set Appraisal Value', func: setAppraisalValue },
      { name: 'Merge Descriptions', func: mergeDescriptions },
      { name: 'Updating Post Title', func: updatePostTitle },
      { name: 'Template Inserted', func: insertTemplate },
      { name: 'Appraisal Text Filled', func: completarTasacion },
      { name: 'PDF built and links inserted', func: buildPDF },
      { name: 'Email sent', func: sendEmailToCustomer },
      { name: 'Completed', func: markAppraisalAsCompleted },
    ];

    let startIndex = -1;

    // Variable para almacenar postId
    let postId;

    // Ejecutar los pasos restantes
    for (let i = startIndex + 1; i < steps.length; i++) {
      const step = steps[i];
      console.log(`[processAppraisal] Executing step: ${step.name}`);

      // Llamar a la función correspondiente
      if (step.name === 'Set Appraisal Value') {
        await step.func(id, appraisalValue, description);
      } else if (step.name === 'Merge Descriptions') {
        await step.func(id, description);
      } else if (step.name === 'Updating Post Title') {
        postId = await step.func(id); // Almacenar postId para uso posterior
      } else if (step.name === 'Template Inserted') {
        await step.func(id);
      } else if (step.name === 'Appraisal Text Filled') {
        await step.func(postId, id); // completarTasacion
      } else if (step.name === 'PDF built and links inserted') {
        await step.func(id); // buildPDF
      } else if (step.name === 'Email sent') {
        await step.func(id);
      } else if (step.name === 'Completed') {
        await step.func(id, appraisalValue, description);
      } else {
        console.error(`[processAppraisal] Unknown step: ${step.name}`);
        throw new Error(`Unknown step: ${step.name}`);
      }

      console.log(`[processAppraisal] ${step.name} completed for ID: ${id}`);
    }

    console.log(`[processAppraisal] Processing completed successfully for Appraisal ID: ${id}`);
  } catch (error) {
    console.error(`[processAppraisal] Error processing appraisal ID: ${id} - ${error.message}`);
    throw error; // Propagar el error para manejarlo en el caller
  }
}

// Function: appraisalSteps
function appraisalSteps() {
  return {
    setAppraisalValue: (id, appraisalValue, description, sheetName) =>
      setAppraisalValue(id, appraisalValue, description, sheetName),
    mergeDescriptions: (id, appraiserDescription) => mergeDescriptions(id, appraiserDescription),
    completarTasacion: (postId, id) => completarTasacion(postId, id),
    updatePostTitle: (id) => updatePostTitle(id),
    insertTemplate: (id) => insertTemplate(id),
    sendEmailToCustomer: (id) => sendEmailToCustomer(id),
    markAppraisalAsCompleted: (id, appraisalValue, description) =>
      markAppraisalAsCompleted(id, appraisalValue, description),
    buildPDF: (id) => buildPDF(id),
    getSessionId: (postId) => getSessionId(postId),
    updateLinks: (id, postId) => updateLinks(id, postId),
    updateCurrentStepInSheet: (id, currentStep) => updateCurrentStepInSheet(id, currentStep),
    processAppraisal: (id, appraisalValue, description) => processAppraisal(id, appraisalValue, description),
  };
}

// Exportar las funciones individuales y la función appraisalSteps
module.exports = {
  initialize,
  setAppraisalValue,
  mergeDescriptions,
  updatePostTitle,
  insertTemplate,
  sendEmailToCustomer,
  markAppraisalAsCompleted,
  buildPDF,
  getSessionId,
  updateLinks,
  updateShortcodesFlag,
  updateCurrentStepInSheet,
  processAppraisal,
  appraisalSteps,
};
