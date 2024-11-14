const { initializeSheets } = require('./googleSheets');
const { config } = require('../config');
const fetch = require('node-fetch');
const OpenAI = require('openai');
const { getSecret } = require('../utils/secretManager');

class AppraisalWorkerService {
  constructor() {
    this.sheets = null;
    this.openai = null;
  }

  async initialize() {
    try {
      this.sheets = await initializeSheets();
      
      // Get OpenAI API key from Secret Manager
      const openaiApiKey = await getSecret('OPENAI_API_KEY');
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not found in Secret Manager');
      }
      
      this.openai = new OpenAI({ apiKey: openaiApiKey.trim() });
      console.log('AppraisalWorkerService initialized successfully');
    } catch (error) {
      console.error('Error initializing AppraisalWorkerService:', error);
      throw error;
    }
  }

  // Rest of the service methods remain the same
  async updateStatus(id, status) {
    const range = `${config.GOOGLE_SHEET_NAME}!F${id}`;
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range,
      valueInputOption: 'RAW',
      resource: {
        values: [[status]]
      }
    });
    console.log(`Status updated to: ${status} for appraisal ${id}`);
  }

  async updateAppraisalValue(id, appraisalValue, description) {
    await this.updateStatus(id, 'Updating Value');
    
    // Update Google Sheets
    const range = `${config.GOOGLE_SHEET_NAME}!J${id}:K${id}`;
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range,
      valueInputOption: 'RAW',
      resource: {
        values: [[appraisalValue, description]]
      }
    });

    // Get WordPress post ID
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: `${config.GOOGLE_SHEET_NAME}!G${id}`,
    });

    const wordpressUrl = response.data.values?.[0]?.[0];
    if (!wordpressUrl) throw new Error('WordPress URL not found');

    const postId = new URL(wordpressUrl).searchParams.get('post');
    if (!postId) throw new Error('WordPress post ID not found');

    // Update WordPress ACF
    const wpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${postId}`;
    const authHeader = 'Basic ' + Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64');

    const wpResponse = await fetch(wpEndpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        acf: {
          value: appraisalValue
        }
      })
    });

    if (!wpResponse.ok) throw new Error('Failed to update WordPress value');
  }

  async mergeDescriptions(id, appraiserDescription) {
    await this.updateStatus(id, 'Merging Descriptions');

    // Get IA description from sheets
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: `${config.GOOGLE_SHEET_NAME}!H${id}`,
    });

    const iaDescription = response.data.values?.[0]?.[0];
    if (!iaDescription) throw new Error('IA description not found');

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Merge the appraiser and AI descriptions into a single, cohesive paragraph. Prefer the appraiser's description in case of contradictions. Keep it under 350 characters."
        },
        {
          role: "user",
          content: `Appraiser: ${appraiserDescription}\nAI: ${iaDescription}`
        }
      ]
    });

    const mergedDescription = completion.choices[0].message.content.trim();

    // Save merged description
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: `${config.GOOGLE_SHEET_NAME}!L${id}`,
      valueInputOption: 'RAW',
      resource: {
        values: [[mergedDescription]]
      }
    });

    return mergedDescription;
  }

  async updatePostTitle(id, mergedDescription) {
    await this.updateStatus(id, 'Updating Title');

    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: `${config.GOOGLE_SHEET_NAME}!G${id}`,
    });

    const wordpressUrl = response.data.values?.[0]?.[0];
    if (!wordpressUrl) throw new Error('WordPress URL not found');

    const postId = new URL(wordpressUrl).searchParams.get('post');
    if (!postId) throw new Error('WordPress post ID not found');

    const wpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${postId}`;
    const authHeader = 'Basic ' + Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64');

    const wpResponse = await fetch(wpEndpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        title: mergedDescription
      })
    });

    if (!wpResponse.ok) throw new Error('Failed to update WordPress title');
  }

  async insertTemplate(id) {
    await this.updateStatus(id, 'Inserting Template');

    // Get appraisal details
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: `${config.GOOGLE_SHEET_NAME}!A${id}:G${id}`,
    });

    const row = response.data.values?.[0];
    if (!row) throw new Error('Appraisal not found');

    const appraisalType = row[1] || 'RegularArt';
    const wordpressUrl = row[6];
    if (!wordpressUrl) throw new Error('WordPress URL not found');

    const postId = new URL(wordpressUrl).searchParams.get('post');
    if (!postId) throw new Error('WordPress post ID not found');

    const wpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${postId}`;
    const authHeader = 'Basic ' + Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64');

    // Check if template already inserted
    const checkResponse = await fetch(wpEndpoint, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      }
    });

    if (!checkResponse.ok) throw new Error('Failed to check WordPress post');
    
    const postData = await checkResponse.json();
    if (postData.acf?.shortcodes_inserted) {
      console.log('Template already inserted, skipping...');
      return;
    }

    // Insert template
    const updateResponse = await fetch(wpEndpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        content: `[pdf_download]\n[AppraisalTemplates type="${appraisalType}"]`,
        acf: {
          shortcodes_inserted: true
        }
      })
    });

    if (!updateResponse.ok) throw new Error('Failed to insert template');
  }

  async generateDocuments(id) {
    await this.updateStatus(id, 'Generating Documents');

    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: `${config.GOOGLE_SHEET_NAME}!G${id}`,
    });

    const wordpressUrl = response.data.values?.[0]?.[0];
    if (!wordpressUrl) throw new Error('WordPress URL not found');

    const postId = new URL(wordpressUrl).searchParams.get('post');
    if (!postId) throw new Error('WordPress post ID not found');

    // Get session_ID from WordPress
    const wpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${postId}`;
    const authHeader = 'Basic ' + Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64');

    const wpResponse = await fetch(wpEndpoint, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      }
    });

    if (!wpResponse.ok) throw new Error('Failed to get WordPress data');
    
    const wpData = await wpResponse.json();
    const session_ID = wpData.acf?.session_id;
    if (!session_ID) throw new Error('session_ID not found');

    // Generate PDF
    const pdfResponse = await fetch('https://appraisals-backend-856401495068.us-central1.run.app/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, session_ID })
    });

    if (!pdfResponse.ok) throw new Error('Failed to generate PDF');

    // Update links in sheets
    const linksResponse = await fetch(wpEndpoint, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      }
    });

    if (!linksResponse.ok) throw new Error('Failed to get document links');
    
    const linksData = await linksResponse.json();
    const pdfLink = linksData.acf?.pdflink;
    const docLink = linksData.acf?.doclink;

    if (!pdfLink || !docLink) throw new Error('Document links not found');

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: `${config.GOOGLE_SHEET_NAME}!M${id}:N${id}`,
      valueInputOption: 'RAW',
      resource: {
        values: [[pdfLink, docLink]]
      }
    });
  }

  async sendEmailToCustomer(id) {
    await this.updateStatus(id, 'Sending Email');

    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      range: `${config.GOOGLE_SHEET_NAME}!A${id}:N${id}`,
    });

    const row = response.data.values?.[0];
    if (!row) throw new Error('Appraisal not found');

    const customerEmail = row[3];
    const customerName = row[4];
    const wordpressUrl = row[6];
    const appraisalValue = row[9];
    const description = row[10];
    const pdfLink = row[12];

    if (!customerEmail || !wordpressUrl) throw new Error('Required data missing');

    const postId = new URL(wordpressUrl).searchParams.get('post');
    if (!postId) throw new Error('WordPress post ID not found');

    // Get public URL
    const wpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${postId}`;
    const authHeader = 'Basic ' + Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64');

    const wpResponse = await fetch(wpEndpoint, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      }
    });

    if (!wpResponse.ok) throw new Error('Failed to get WordPress data');
    
    const wpData = await wpResponse.json();
    const publicUrl = wpData.link;

    // Send email
    const emailData = {
      to: customerEmail,
      from: config.SENDGRID_EMAIL,
      templateId: config.SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED,
      dynamic_template_data: {
        customer_name: customerName,
        appraisal_value: appraisalValue,
        description: description,
        pdf_link: pdfLink,
        appraisal_link: publicUrl,
        dashboard_link: `https://www.appraisily.com/dashboard/?email=${encodeURIComponent(customerEmail)}`,
        current_year: new Date().getFullYear()
      }
    };

    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(config.SENDGRID_API_KEY);
    await sgMail.send(emailData);
  }

  async markAsCompleted(id) {
    await this.updateStatus(id, 'Completed');
  }
}

module.exports = new AppraisalWorkerService();