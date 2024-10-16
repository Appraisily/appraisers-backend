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

// Function: mergeDescriptions
async function mergeDescriptions(id, appraiserDescription) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not defined in environment variables.');
    throw new Error('Server configuration error. Please contact support.');
  }

  try {
    // Retrieve iaDescription from Google Sheets (Column H)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!H${id}:H${id}`, // Column H: iaDescription
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
    const updateRange = `${SHEET_NAME}!L${id}:L${id}`; // Column L
    const updateValues = [[blendedDescription]];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
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
    const appraisalResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${id}:K${id}`, // Adjust the range as needed
    });

    const appraisalRow = appraisalResponse.data.values ? appraisalResponse.data.values[0] : null;

    if (!appraisalRow) {
      throw new Error('Appraisal not found for updating in WordPress.');
    }

    const appraisalWordpressUrl = appraisalRow[6] || ''; // Column G: WordPress URL
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
    console.log(`[updatePostTitle] WordPress post title updated successfully:`, wpUpdateData);

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
      'RegularArt': 114984,
      'PremiumArt': 137078,
      // Add more types as needed
    };

    // Get appraisal details to obtain the WordPress URL and Type
    const appraisalResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${id}:K${id}`, // Adjust the range as needed
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

    console.log(`[insertTemplate] Shortcodes inserted successfully in WordPress post.`);

    // Update the ACF flag
    await updateShortcodesFlag(wpPostId, authHeader);

  } catch (error) {
    console.error('Error in insertTemplate:', error);
    throw error;
  }
}

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



// Function: sendEmailToCustomer
async function sendEmailToCustomer(id) {
  try {
    // Get appraisal details from Google Sheets
    const appraisalResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${id}:N${id}`, // Include columns up to N to get PDF link
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
    const templateId = 'YOUR_SENDGRID_TEMPLATE_ID';

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

    console.log(`[sendEmailToCustomer] Email successfully sent to: ${customerEmail}`);

  } catch (error) {
    console.error('Error in sendEmailToCustomer:', error);
    throw error;
  }
}

// Function: markAppraisalAsCompleted
async function markAppraisalAsCompleted(id, appraisalValue, description) {
  try {
    // Update columns J and K with the provided data
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

    // Update the status to "Completed" in column F
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

    console.log(`[markAppraisalAsCompleted] Appraisal ID ${id} marked as completed.`);

  } catch (error) {
    console.error('Error in markAppraisalAsCompleted:', error);
    throw error;
  }
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
