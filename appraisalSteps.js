// appraisalSteps.js

const sheets = require('./sheets'); // Assume this is your Google Sheets client
const fetch = require('node-fetch');
const { google } = require('googleapis');

// Function: setAppraisalValue
async function setAppraisalValue(id, appraisalValue, description) {
  if (appraisalValue === undefined || description === undefined) {
    throw new Error('Appraisal Value and description are required.');
  }

  try {
    // Update columns J and K in Google Sheets
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

    console.log(`[setAppraisalValue] Updated columns J and K for row ${id} with Appraisal Value: ${appraisalValue} and Description: ${description}`);

    // Get appraisal details to obtain the WordPress URL
    const appraisalResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${id}:I${id}`,
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

    const wpUpdateData = await wpUpdateResponse.json();
    console.log(`[setAppraisalValue] WordPress updated successfully:`, wpUpdateData);

  } catch (error) {
    console.error('Error in setAppraisalValue:', error);
    throw error;
  }
}

// Function: Merge Descriptions
async function mergeDescriptions(id, appraiserDescription) {
  // Logic from /api/appraisals/:id/merge-descriptions
}

// Function: Update Post Title
async function updatePostTitle(id) {
  // Logic from /api/appraisals/:id/update-title
}

// Function: Insert Template
async function insertTemplate(id) {
  // Logic from /api/appraisals/:id/insert-template
}

// Function: Build PDF
async function buildPDF(id) {
  // Logic for building the PDF
}

// Function: Send Email
async function sendEmailToCustomer(id) {
  // Logic from /api/appraisals/:id/send-email
}

// Function: Mark Appraisal as Completed
async function markAppraisalAsCompleted(id, appraisalValue, description) {
  // Logic from /api/appraisals/:id/complete
}

module.exports = {
  setAppraisalValue,
  mergeDescriptions,
  updatePostTitle,
  insertTemplate,
  buildPDF,
  sendEmailToCustomer,
  markAppraisalAsCompleted
};
