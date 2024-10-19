// appraisalSteps.js

const fetch = require('node-fetch');
require('dotenv').config(); // Asegurarse de que las variables de entorno están cargadas

// Importar Google Sheets API si es necesario
const { google } = require('googleapis');

const { config } = require('./config'); // Asegúrate de que la ruta es correcta

// Variable global para sheets (si es necesario)
let sheetsGlobal; // Declarar la variable global

// Function: updateCurrentStepInSheet
async function updateCurrentStepInSheet(sheets, id, currentStep) {
    console.log(`[updateCurrentStepInSheet] Called with id:`, id, `type:`, typeof id);

  try {
    const updateRange = `${config.SHEET_NAME}!F${id}:F${id}`; // Column F
    const values = [[currentStep]];

    await sheets.spreadsheets.values.update({
      spreadsheetId: config.SPREADSHEET_ID, // Usar config.SPREADSHEET_ID
      range: updateRange,
      valueInputOption: 'RAW',
      resource: {
        values: values,
      },
    });

    console.log(`[updateCurrentStepInSheet] Updated column F for row ${id} with current step: ${currentStep}`);
  } catch (error) {
    console.error('Error updating current step in Google Sheets:', error);
    // Opcional: lanzar el error si deseas manejarlo en el caller
    throw error;
  }
}

// Function: setAppraisalValue
async function setAppraisalValue(sheets, id, appraisalValue, description) {
    console.log(`[setAppraisalValue] Called with id:`, id, `type:`, typeof id);

  if (appraisalValue === undefined || description === undefined) {
    throw new Error('Appraisal Value and description are required.');
  }

  try {
    // Update the current step in the spreadsheet
    await updateCurrentStepInSheet(sheets, id, 'Set Appraisal Value');

    // Update columns J and K in Google Sheets
    const updateRange = `${config.SHEET_NAME}!J${id}:K${id}`;
    const values = [[appraisalValue, description]];

    await sheets.spreadsheets.values.update({
      spreadsheetId: config.SPREADSHEET_ID,
      range: updateRange,
      valueInputOption: 'RAW',
      resource: {
        values: values,
      },
    });

    console.log(`[setAppraisalValue] Updated columns J and K for row ${id} with Appraisal Value: ${appraisalValue} and Description: ${description}`);

    // Get appraisal details to obtain the WordPress URL
    const appraisalResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: config.SPREADSHEET_ID,
      range: `${config.SHEET_NAME}!A${id}:I${id}`,
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
    const updateWpEndpoint = `${process.env.WORDPRESS_API_URL}/appraisals/${wpPostId}`;
    console.log(`[setAppraisalValue] WordPress update endpoint: ${updateWpEndpoint}`);

    const updateData = {
      acf: {
        value: appraisalValue // Ensure 'value' is the correct ACF field name
      }
    };

    const credentialsString = `${encodeURIComponent(process.env.WORDPRESS_USERNAME)}:${process.env.WORDPRESS_APP_PASSWORD.trim()}`;
    const base64Credentials = Buffer.from(credentialsString).toString('base64');
    const authHeader = 'Basic ' + base64Credentials;
    console.log(`[setAppraisalValue] Authentication configured.`);

    const wpUpdateResponse = await fetch(updateWpEndpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(updateData)
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
async function mergeDescriptions(sheets, id, appraiserDescription) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not defined in environment variables.');
    throw new Error('Server configuration error. Please contact support.');
  }

  try {
    // Update the current step in the spreadsheet
    await updateCurrentStepInSheet(sheets, id, 'Merge Descriptions');

    // Retrieve iaDescription from Google Sheets (Column H)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.SPREADSHEET_ID,
      range: `${config.SHEET_NAME}!H${id}:H${id}`, // Column H: iaDescription
    });

    const iaDescription = response.data.values ? response.data.values[0][0] : null;

    if (!iaDescription) {
      throw new Error('IA description not found in Google Sheets.');
    }

    // Prepare the request to OpenAI GPT-4 Chat API
    const openAIEndpoint = 'https://api.openai.com/v1/chat/completions';

    const openAIRequestBody = {
      model: 'gpt-4',
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

    // Make the request to OpenAI API
    const openAIResponse = await fetch(openAIEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(openAIRequestBody)
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

    const blendedDescription = openAIData.choices[0].message.content.trim();

    console.log('Blended Description:', blendedDescription);

    // Update column L with blendedDescription
    const updateRange = `${config.SHEET_NAME}!L${id}:L${id}`; // Column L
    const updateValues = [[blendedDescription]];

    await sheets.spreadsheets.values.update({
      spreadsheetId: config.SPREADSHEET_ID,
      range: updateRange,
      valueInputOption: 'RAW',
      requestBody: {
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
async function updatePostTitle(sheets, id) {
  try {
    // Get appraisal details to obtain the WordPress URL and new title from Google Sheets
    const appraisalResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: config.SPREADSHEET_ID,
      range: `${config.SHEET_NAME}!A${id}:L${id}`, // Adjust the range as needed
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

    const newTitle = blendedDescription.substring(0, 50) + '...'; // Example of generating a new title

    const parsedWpUrl = new URL(appraisalWordpressUrl);
    const wpPostId = parsedWpUrl.searchParams.get('post');

    if (!wpPostId) {
      throw new Error('Could not extract WordPress post ID.');
    }

    console.log(`[updatePostTitle] Extracted Post ID: ${wpPostId}`);

    // Update the post title in WordPress
    const updateWpEndpoint = `${process.env.WORDPRESS_API_URL}/appraisals/${wpPostId}`;
    console.log(`[updatePostTitle] WordPress update endpoint: ${updateWpEndpoint}`);

    const updateData = {
      title: newTitle
    };

    const credentialsString = `${encodeURIComponent(process.env.WORDPRESS_USERNAME)}:${process.env.WORDPRESS_APP_PASSWORD.trim()}`;
    const base64Credentials = Buffer.from(credentialsString).toString('base64');
    const authHeader = 'Basic ' + base64Credentials;

    console.log(`[updatePostTitle] Authentication configured.`);

    const wpUpdateResponse = await fetch(updateWpEndpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(updateData)
    });

    if (!wpUpdateResponse.ok) {
      const errorText = await wpUpdateResponse.text();
      console.error(`[updatePostTitle] Error updating WordPress: ${errorText}`);
      throw new Error('Error updating WordPress post title.');
    }

    const wpUpdateData = await wpUpdateResponse.json();
    await updateCurrentStepInSheet(sheets, id, 'Updating Post Title');

    console.log(`[updatePostTitle] WordPress post title updated successfully:`, wpUpdateData);

  } catch (error) {
    console.error('Error in updatePostTitle:', error);
    throw error;
  }
}

// Function: insertTemplate
async function insertTemplate(sheets, id) {
  try {
    // Define the mapping of 'type' to 'template_id'
    const typeToTemplateIdMap = {
      'RegularArt': 114984,
      'PremiumArt': 137078,
      // Add more types as needed
    };

    // Get appraisal details to obtain the WordPress URL and Type
    const appraisalResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: config.SPREADSHEET_ID,
      range: `${config.SHEET_NAME}!A${id}:K${id}`, // Adjust the range as needed
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

    const wpUsername = process.env.WORDPRESS_USERNAME;
    const wpAppPassword = process.env.WORDPRESS_APP_PASSWORD;

    if (!wpUsername || !wpAppPassword) {
      throw new Error('Missing WordPress credentials.');
    }

    const updateWpEndpoint = `${process.env.WORDPRESS_API_URL}/appraisals/${wpPostId}`;
    console.log(`[insertTemplate] WordPress update endpoint: ${updateWpEndpoint}`);

    const credentialsString = `${encodeURIComponent(wpUsername)}:${wpAppPassword.trim()}`;
    const base64Credentials = Buffer.from(credentialsString).toString('base64');
    const authHeader = 'Basic ' + base64Credentials;

    // Get the current post content
    const currentPostResponse = await fetch(updateWpEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
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
        'Authorization': authHeader
      },
      body: JSON.stringify({
        content: updatedContent
      })
    });

    if (!updatePostResponse.ok) {
      const errorText = await updatePostResponse.text();
      console.error(`[insertTemplate] Error updating WordPress post: ${errorText}`);
      throw new Error('Error updating WordPress post.');
    }
    await updateCurrentStepInSheet(sheets, id, 'Template Inserted');

    console.log(`[insertTemplate] Shortcodes inserted successfully in WordPress post.`);

    // Update the ACF flag
    await updateShortcodesFlag(wpPostId, authHeader);

  } catch (error) {
    console.error('Error in insertTemplate:', error);
    throw error;
  }
}

// Function: sendEmailToCustomer
async function sendEmailToCustomer(sheets, id) {
  try {
    // Get appraisal details from Google Sheets
    const appraisalResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: config.SPREADSHEET_ID,
      range: `${config.SHEET_NAME}!A${id}:N${id}`, // Include columns up to N to get PDF link
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
    const wpEndpoint = `${process.env.WORDPRESS_API_URL}/appraisals/${wpPostId}`;
    console.log(`[sendEmailToCustomer] WordPress API endpoint: ${wpEndpoint}`);

    const credentialsString = `${encodeURIComponent(process.env.WORDPRESS_USERNAME)}:${process.env.WORDPRESS_APP_PASSWORD.trim()}`;
    const base64Credentials = Buffer.from(credentialsString).toString('base64');
    const authHeader = 'Basic ' + base64Credentials;

    // Fetch post data from WordPress
    const wpResponse = await fetch(wpEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
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

    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const SENDGRID_EMAIL = process.env.SENDGRID_EMAIL;

    if (!SENDGRID_API_KEY || !SENDGRID_EMAIL) {
      throw new Error('Missing SendGrid credentials.');
    }

    // Define your SendGrid template ID
    const templateId = 'YOUR_SENDGRID_TEMPLATE_ID'; // Reemplaza con tu template ID real de SendGrid

    // Send Email using SendGrid with the template
    const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SENDGRID_API_KEY}`
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: customerEmail }],
          dynamic_template_data: {
            appraisal_link: publicUrl,
            pdf_link: pdfLink,
            dashboard_link: customerDashboardLink,
            // Include other dynamic data as needed
          },
        }],
        from: { email: SENDGRID_EMAIL, name: 'Appraisily' },
        template_id: templateId
      })
    });

    if (!sendGridResponse.ok) {
      const errorText = await sendGridResponse.text();
      console.error(`[sendEmailToCustomer] Error sending email via SendGrid: ${errorText}`);
      throw new Error('Error sending email to customer.');
    }
    await updateCurrentStepInSheet(sheets, id, 'Email sent');

    console.log(`[sendEmailToCustomer] Email successfully sent to: ${customerEmail}`);

  } catch (error) {
    console.error('Error in sendEmailToCustomer:', error);
    throw error;
  }
}

// Function: markAppraisalAsCompleted
async function markAppraisalAsCompleted(sheets, id, appraisalValue, description) {
  try {
    // Update the current step in the spreadsheet
    await updateCurrentStepInSheet(sheets, id, 'Completed');

    // Update columns J and K with the provided data
    const updateRange = `${config.SHEET_NAME}!J${id}:K${id}`;
    const values = [[appraisalValue, description]];

    await sheets.spreadsheets.values.update({
      spreadsheetId: config.SPREADSHEET_ID,
      range: updateRange,
      valueInputOption: 'RAW',
      resource: {
        values: values,
      },
    });

    // Update the status to "Completed" in column F
    const statusUpdateRange = `${config.SHEET_NAME}!F${id}:F${id}`;
    const statusValues = [['Completed']];

    await sheets.spreadsheets.values.update({
      spreadsheetId: config.SPREADSHEET_ID,
      range: statusUpdateRange,
      valueInputOption: 'RAW',
      resource: {
        values: statusValues,
      },
    });

    console.log(`[markAppraisalAsCompleted] Appraisal ID ${id} marked as completed.`);

  } catch (error) {
    console.error('Error in markAppraisalAsCompleted:', error);
    throw error;
  }
}

// Function: buildPDF
async function buildPDF(id) {
  try {
    // Get appraisal details from Google Sheets to obtain the WordPress URL
    const appraisalResponse = await sheetsGlobal.spreadsheets.values.get({
      spreadsheetId: config.SPREADSHEET_ID,
      range: `${config.SHEET_NAME}!A${id}:N${id}`, // Adjust the range as needed
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
      body: JSON.stringify({ postId: postId, session_ID: session_ID })
    });

    const buildPdfData = await buildPdfResponse.json();

    if (!buildPdfData.success) {
      throw new Error(buildPdfData.message || 'Error building PDF.');
    }

    // Update the links in Google Sheets
    await updateLinks(id, postId);

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
    const wpEndpoint = `${process.env.WORDPRESS_API_URL}/appraisals/${postId}`;
    console.log(`[getSessionId] WordPress Endpoint: ${wpEndpoint}`);

    // Authentication with WordPress
    const credentialsString = `${encodeURIComponent(process.env.WORDPRESS_USERNAME)}:${process.env.WORDPRESS_APP_PASSWORD.trim()}`;
    const base64Credentials = Buffer.from(credentialsString).toString('base64');
    const authHeader = 'Basic ' + base64Credentials;

    // Make GET request to WordPress REST API
    const wpResponse = await fetch(wpEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
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
    // Get the links from the ACF fields in WordPress
    const wpEndpoint = `${process.env.WORDPRESS_API_URL}/appraisals/${postId}`;
    console.log(`[updateLinks] WordPress Endpoint: ${wpEndpoint}`);

    // Authentication with WordPress
    const credentialsString = `${encodeURIComponent(process.env.WORDPRESS_USERNAME)}:${process.env.WORDPRESS_APP_PASSWORD.trim()}`;
    const base64Credentials = Buffer.from(credentialsString).toString('base64');
    const authHeader = 'Basic ' + base64Credentials;

    // Get the post from WordPress
    const wpResponse = await fetch(wpEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
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

    // Update columns M and N in Google Sheets
    const updateRange = `${config.SHEET_NAME}!M${id}:N${id}`; // Columns M and N
    const values = [[pdfLink, docLink]];

    await sheets.spreadsheets.values.update({
      spreadsheetId: config.SPREADSHEET_ID,
      range: updateRange,
      valueInputOption: 'RAW',
      resource: {
        values: values,
      },
    });

    console.log(`[updateLinks] Updated columns M and N for row ${id} with PDF Link: ${pdfLink} y Doc Link: ${docLink}`);

  } catch (error) {
    console.error('Error in updateLinks:', error);
    throw error;
  }
}

// Function: updateShortcodesFlag
async function updateShortcodesFlag(wpPostId, authHeader) {
  const updateWpEndpoint = `${process.env.WORDPRESS_API_URL}/appraisals/${wpPostId}`;
  console.log(`[updateShortcodesFlag] Updating ACF flag for post ID: ${wpPostId}`);

  const updateFlagResponse = await fetch(updateWpEndpoint, {
    method: 'PUT',
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
    console.error(`[updateShortcodesFlag] Error updating ACF flag: ${errorText}`);
    throw new Error('Error updating ACF flag.');
  }

  const updateFlagData = await updateFlagResponse.json();
  console.log(`[updateShortcodesFlag] ACF flag updated successfully:`, updateFlagData);
}

// Function: processAppraisal
async function processAppraisal(id, appraisalValue, description) {
  try {
    console.log(`[processAppraisal] Starting process for Appraisal ID: ${id}`);

    // Paso 1: Establecer el valor de la tasación
    await setAppraisalValue(sheetsGlobal, id, appraisalValue, description);
    console.log(`[processAppraisal] setAppraisalValue completed for ID: ${id}`);

    // Paso 2: Combinar descripciones
    await mergeDescriptions(sheetsGlobal, id, description);
    console.log(`[processAppraisal] mergeDescriptions completed for ID: ${id}`);

    // Paso 3: Actualizar el título del post en WordPress
    await updatePostTitle(sheetsGlobal, id);
    console.log(`[processAppraisal] updatePostTitle completed for ID: ${id}`);

    // Paso 4: Insertar plantillas en WordPress
    await insertTemplate(sheetsGlobal, id);
    console.log(`[processAppraisal] insertTemplate completed for ID: ${id}`);

    // Paso 5: Enviar correo al cliente
    await sendEmailToCustomer(sheetsGlobal, id);
    console.log(`[processAppraisal] sendEmailToCustomer completed for ID: ${id}`);

    // Paso 6: Marcar la tasación como completada
    await markAppraisalAsCompleted(sheetsGlobal, id, appraisalValue, description);
    console.log(`[processAppraisal] markAppraisalAsCompleted completed for ID: ${id}`);

    // Paso 7: Construir PDF
    await buildPDF(id);
    console.log(`[processAppraisal] buildPDF completed for ID: ${id}`);

    console.log(`[processAppraisal] Processing completed successfully for Appraisal ID: ${id}`);
  } catch (error) {
    console.error(`[processAppraisal] Error processing appraisal ID: ${id} - ${error.message}`);
    throw error; // Propagar el error para manejarlo en el caller
  }
}

// Function: appraisalSteps
function appraisalSteps(sheets, config = {}) {
  const SPREADSHEET_ID = config.SPREADSHEET_ID;
  const SHEET_NAME = config.SHEET_NAME;
      sheetsGlobal = sheets; // Asignar sheets a la variable global

 return {
    setAppraisalValue: (id, appraisalValue, description) =>
      setAppraisalValue(sheets, id, appraisalValue, description),
    mergeDescriptions: (id, appraiserDescription) =>
      mergeDescriptions(sheets, id, appraiserDescription),
    updatePostTitle: (id) =>
      updatePostTitle(sheets, id),
    insertTemplate: (id) =>
      insertTemplate(sheets, id),
    sendEmailToCustomer: (id) =>
      sendEmailToCustomer(sheets, id),
    markAppraisalAsCompleted: (id, appraisalValue, description) =>
      markAppraisalAsCompleted(sheets, id, appraisalValue, description),
    buildPDF: (id) =>
      buildPDF(id),
    getSessionId: (postId) =>
      getSessionId(postId),
    updateLinks: (id, postId) =>
      updateLinks(id, postId),
    updateCurrentStepInSheet: (id, currentStep) =>
      updateCurrentStepInSheet(sheets, id, currentStep),
    processAppraisal: (id, appraisalValue, description) =>
      processAppraisal(id, appraisalValue, description),
  };
}

// Exportar las funciones individuales y la función appraisalSteps
module.exports = {
  setAppraisalValue,
  mergeDescriptions,
  updatePostTitle,
  insertTemplate,
  sendEmailToCustomer,
  markAppraisalAsCompleted,
  buildPDF,
  getSessionId,
  updateLinks,
  updateCurrentStepInSheet,
  processAppraisal, // Exportar si deseas acceder a ella directamente
  appraisalSteps,
};
