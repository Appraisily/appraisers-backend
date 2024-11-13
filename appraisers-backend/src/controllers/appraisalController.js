const { PubSub } = require('@google-cloud/pubsub');
const { config } = require('../config');
const { initializeSheets } = require('../services/googleSheets');
const emailService = require('../services/emailService');
const getImageUrl = require('../utils/getImageUrl');
const fetch = require('node-fetch');

class AppraisalController {
  static async getAppraisals(req, res) {
    try {
      const sheets = await initializeSheets();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range: `${config.GOOGLE_SHEET_NAME}!A2:H`,
      });

      const rows = response.data.values || [];
      const appraisals = rows.map((row, index) => ({
        id: index + 2,
        date: row[0] || '',
        appraisalType: row[1] || '',
        identifier: row[2] || '',
        status: row[5] || '',
        wordpressUrl: row[6] || '',
        iaDescription: row[7] || '',
      }));

      res.json(appraisals);
    } catch (error) {
      console.error('Error getting appraisals:', error);
      res.status(500).json({ success: false, message: 'Error getting appraisals.' });
    }
  }

  static async getCompletedAppraisals(req, res) {
    try {
      const sheets = await initializeSheets();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range: 'Completed Appraisals!A2:H',
      });

      const rows = response.data.values || [];
      const completedAppraisals = rows.map((row, index) => ({
        id: index + 2,
        date: row[0] || '',
        appraisalType: row[1] || '',
        identifier: row[2] || '',
        status: row[5] || '',
        wordpressUrl: row[6] || '',
        iaDescription: row[7] || '',
      }));

      res.json(completedAppraisals);
    } catch (error) {
      console.error('Error getting completed appraisals:', error);
      res.status(500).json({ success: false, message: 'Error getting completed appraisals.' });
    }
  }

  static async getAppraisalDetails(req, res) {
    const { id } = req.params;
    try {
      const sheets = await initializeSheets();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range: `${config.GOOGLE_SHEET_NAME}!A${id}:I${id}`,
      });

      const row = response.data.values ? response.data.values[0] : null;
      if (!row) {
        return res.status(404).json({ success: false, message: 'Appraisal not found.' });
      }

      const appraisal = {
        id,
        date: row[0] || '',
        appraisalType: row[1] || '',
        identifier: row[2] || '',
        customerEmail: row[3] || '',
        customerName: row[4] || '',
        status: row[5] || '',
        wordpressUrl: row[6] || '',
        iaDescription: row[7] || '',
        customerDescription: row[8] || '',
      };

      const wordpressUrl = appraisal.wordpressUrl;
      const parsedUrl = new URL(wordpressUrl);
      const postId = parsedUrl.searchParams.get('post');

      if (!postId) {
        return res.status(400).json({ success: false, message: 'Could not extract WordPress post ID.' });
      }

      const wpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${postId}`;
      const authHeader = 'Basic ' + Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64');

      const wpResponse = await fetch(wpEndpoint, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
      });

      if (!wpResponse.ok) {
        return res.status(500).json({ success: false, message: 'Error getting WordPress data.' });
      }

      const wpData = await wpResponse.json();
      const acfFields = wpData.acf || {};

      appraisal.images = {
        main: await getImageUrl(acfFields.main),
        age: await getImageUrl(acfFields.age),
        signature: await getImageUrl(acfFields.signature),
      };

      res.json(appraisal);
    } catch (error) {
      console.error('Error getting appraisal details:', error);
      res.status(500).json({ success: false, message: 'Error getting appraisal details.' });
    }
  }

  static async getAppraisalDetailsForEdit(req, res) {
    const { id } = req.params;
    try {
      const sheets = await initializeSheets();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range: `${config.GOOGLE_SHEET_NAME}!A${id}:I${id}`,
      });

      const row = response.data.values ? response.data.values[0] : null;
      if (!row) {
        return res.status(404).json({ success: false, message: 'Appraisal not found.' });
      }

      const appraisal = {
        id,
        date: row[0] || '',
        appraisalType: row[1] || '',
        identifier: row[2] || '',
        customerEmail: row[3] || '',
        customerName: row[4] || '',
        status: row[5] || '',
        wordpressUrl: row[6] || '',
        iaDescription: row[7] || '',
        customerDescription: row[8] || '',
      };

      const wordpressUrl = appraisal.wordpressUrl;
      const parsedUrl = new URL(wordpressUrl);
      const postId = parsedUrl.searchParams.get('post');

      if (!postId) {
        return res.status(400).json({ success: false, message: 'Could not extract WordPress post ID.' });
      }

      const wpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${postId}`;
      const authHeader = 'Basic ' + Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64');

      const wpResponse = await fetch(wpEndpoint, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
      });

      if (!wpResponse.ok) {
        return res.status(500).json({ success: false, message: 'Error getting WordPress data.' });
      }

      const wpData = await wpResponse.json();
      const acfFields = wpData.acf || {};

      appraisal.images = {
        main: await getImageUrl(acfFields.main),
        age: await getImageUrl(acfFields.age),
        signature: await getImageUrl(acfFields.signature),
      };

      appraisal.acfFields = acfFields;

      res.json(appraisal);
    } catch (error) {
      console.error('Error getting appraisal details for edit:', error);
      res.status(500).json({ success: false, message: 'Error getting appraisal details.' });
    }
  }

  static async updateAcfField(req, res) {
    const { id } = req.params;
    const { fieldName, fieldValue } = req.body;

    if (!fieldName) {
      return res.status(400).json({ success: false, message: 'Field name is required.' });
    }

    try {
      const wpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${id}`;
      const authHeader = 'Basic ' + Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64');

      const wpResponse = await fetch(wpEndpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          acf: {
            [fieldName]: fieldValue,
          },
        }),
      });

      if (!wpResponse.ok) {
        const errorText = await wpResponse.text();
        console.error('Error updating ACF field:', errorText);
        return res.status(500).json({ success: false, message: 'Error updating ACF field.' });
      }

      res.json({ success: true, message: 'ACF field updated successfully.' });
    } catch (error) {
      console.error('Error updating ACF field:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async setAppraisalValue(req, res) {
    const { id } = req.params;
    const { appraisalValue, description, isEdit } = req.body;

    try {
      const sheets = await initializeSheets();
      const sheetName = isEdit ? config.EDIT_SHEET_NAME : config.GOOGLE_SHEET_NAME;

      // Update Google Sheets
      const updateRange = `${sheetName}!J${id}:K${id}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range: updateRange,
        valueInputOption: 'RAW',
        resource: {
          values: [[appraisalValue, description]],
        },
      });

      // Get WordPress post ID
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range: `${sheetName}!G${id}`,
      });

      const wordpressUrl = response.data.values?.[0]?.[0];
      if (!wordpressUrl) {
        throw new Error('WordPress URL not found.');
      }

      const parsedUrl = new URL(wordpressUrl);
      const postId = parsedUrl.searchParams.get('post');

      if (!postId) {
        throw new Error('Could not extract WordPress post ID.');
      }

      // Update WordPress ACF field
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
            value: appraisalValue,
          },
        }),
      });

      if (!wpResponse.ok) {
        throw new Error('Error updating WordPress ACF field.');
      }

      res.json({ success: true, message: 'Appraisal value set successfully.' });
    } catch (error) {
      console.error('Error setting appraisal value:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async completeProcess(req, res) {
    const { id } = req.params;
    const { appraisalValue, description } = req.body;

    if (!appraisalValue || !description) {
      return res.status(400).json({ success: false, message: 'Appraisal value and description are required.' });
    }

    try {
      const pubsub = new PubSub({
        projectId: config.GOOGLE_CLOUD_PROJECT_ID,
      });

      const task = {
        id,
        appraisalValue,
        description,
      };

      await pubsub.topic('appraisal-tasks').publish(Buffer.from(JSON.stringify(task)));
      res.json({ success: true, message: 'Appraisal process started successfully.' });
    } catch (error) {
      console.error('Error starting appraisal process:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getSessionId(req, res) {
    const { postId } = req.body;

    if (!postId) {
      return res.status(400).json({ success: false, message: 'Post ID is required.' });
    }

    try {
      const wpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${postId}`;
      const authHeader = 'Basic ' + Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64');

      const wpResponse = await fetch(wpEndpoint, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
      });

      if (!wpResponse.ok) {
        throw new Error('Error getting WordPress data.');
      }

      const wpData = await wpResponse.json();
      const sessionId = wpData.acf?.session_id;

      if (!sessionId) {
        return res.status(404).json({ success: false, message: 'Session ID not found.' });
      }

      res.json({ success: true, session_ID: sessionId });
    } catch (error) {
      console.error('Error getting session ID:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async saveLinks(req, res) {
    const { id } = req.params;
    const { pdfLink, docLink } = req.body;

    if (!pdfLink || !docLink) {
      return res.status(400).json({ success: false, message: 'PDF and Doc links are required.' });
    }

    try {
      const sheets = await initializeSheets();
      const updateRange = `${config.GOOGLE_SHEET_NAME}!M${id}:N${id}`;
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range: updateRange,
        valueInputOption: 'RAW',
        resource: {
          values: [[pdfLink, docLink]],
        },
      });

      res.json({ success: true, message: 'Links saved successfully.' });
    } catch (error) {
      console.error('Error saving links:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async insertTemplate(req, res) {
    const { id } = req.params;

    try {
      const sheets = await initializeSheets();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range: `${config.GOOGLE_SHEET_NAME}!A${id}:G${id}`,
      });

      const row = response.data.values?.[0];
      if (!row) {
        throw new Error('Appraisal not found.');
      }

      const appraisalType = row[1] || 'RegularArt';
      const wordpressUrl = row[6];

      if (!wordpressUrl) {
        throw new Error('WordPress URL not found.');
      }

      const parsedUrl = new URL(wordpressUrl);
      const postId = parsedUrl.searchParams.get('post');

      if (!postId) {
        throw new Error('Could not extract WordPress post ID.');
      }

      const wpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${postId}`;
      const authHeader = 'Basic ' + Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64');

      // Get current content
      const wpResponse = await fetch(wpEndpoint, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
      });

      if (!wpResponse.ok) {
        throw new Error('Error getting WordPress content.');
      }

      const wpData = await wpResponse.json();
      let content = wpData.content.rendered || '';

      // Add shortcodes if not present
      if (!content.includes('[pdf_download]')) {
        content += '\n[pdf_download]';
      }

      if (!content.includes(`[AppraisalTemplates type="${appraisalType}"]`)) {
        content += `\n[AppraisalTemplates type="${appraisalType}"]`;
      }

      // Update content
      const updateResponse = await fetch(wpEndpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          content,
          acf: {
            shortcodes_inserted: true,
          },
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Error updating WordPress content.');
      }

      res.json({ success: true, message: 'Template inserted successfully.' });
    } catch (error) {
      console.error('Error inserting template:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updatePostTitle(req, res) {
    const { id } = req.params;

    try {
      const sheets = await initializeSheets();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range: `${config.GOOGLE_SHEET_NAME}!A${id}:L${id}`,
      });

      const row = response.data.values?.[0];
      if (!row) {
        throw new Error('Appraisal not found.');
      }

      const wordpressUrl = row[6];
      const blendedDescription = row[11];

      if (!wordpressUrl || !blendedDescription) {
        throw new Error('Required data not found.');
      }

      const parsedUrl = new URL(wordpressUrl);
      const postId = parsedUrl.searchParams.get('post');

      if (!postId) {
        throw new Error('Could not extract WordPress post ID.');
      }

      const wpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${postId}`;
      const authHeader = 'Basic ' + Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64');

      const updateResponse = await fetch(wpEndpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          title: blendedDescription,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Error updating WordPress title.');
      }

      res.json({ success: true, message: 'Post title updated successfully.' });
    } catch (error) {
      console.error('Error updating post title:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async sendEmailToCustomer(req, res) {
    const { id } = req.params;

    try {
      const sheets = await initializeSheets();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range: `${config.GOOGLE_SHEET_NAME}!A${id}:N${id}`,
      });

      const row = response.data.values?.[0];
      if (!row) {
        throw new Error('Appraisal not found.');
      }

      const customerEmail = row[3];
      const customerName = row[4];
      const wordpressUrl = row[6];
      const pdfLink = row[12];

      if (!customerEmail || !wordpressUrl) {
        throw new Error('Required data not found.');
      }

      const parsedUrl = new URL(wordpressUrl);
      const postId = parsedUrl.searchParams.get('post');

      if (!postId) {
        throw new Error('Could not extract WordPress post ID.');
      }

      // Get public URL from WordPress
      const wpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${postId}`;
      const authHeader = 'Basic ' + Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64');

      const wpResponse = await fetch(wpEndpoint, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
      });

      if (!wpResponse.ok) {
        throw new Error('Error getting WordPress data.');
      }

      const wpData = await wpResponse.json();
      const publicUrl = wpData.link;

      await emailService.sendAppraisalCompletedEmail(customerEmail, customerName, {
        value: row[9] || '',
        description: row[10] || '',
        pdfLink: pdfLink,
        publicUrl: publicUrl,
      });

      res.json({ success: true, message: 'Email sent successfully.' });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateLinks(req, res) {
    const { id } = req.params;
    const { postId } = req.body;

    if (!postId) {
      return res.status(400).json({ success: false, message: 'Post ID is required.' });
    }

    try {
      const wpEndpoint = `${config.WORDPRESS_API_URL}/appraisals/${postId}`;
      const authHeader = 'Basic ' + Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64');

      const wpResponse = await fetch(wpEndpoint, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
      });

      if (!wpResponse.ok) {
        throw new Error('Error getting WordPress data.');
      }

      const wpData = await wpResponse.json();
      const pdfLink = wpData.acf?.pdflink;
      const docLink = wpData.acf?.doclink;

      if (!pdfLink || !docLink) {
        throw new Error('PDF or Doc link not found.');
      }

      const sheets = await initializeSheets();
      const updateRange = `${config.GOOGLE_SHEET_NAME}!M${id}:N${id}`;
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range: updateRange,
        valueInputOption: 'RAW',
        resource: {
          values: [[pdfLink, docLink]],
        },
      });

      res.json({ success: true, message: 'Links updated successfully.' });
    } catch (error) {
      console.error('Error updating links:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async completeAppraisal(req, res) {
    const { id } = req.params;
    const { appraisalValue, description } = req.body;

    try {
      const sheets = await initializeSheets();
      
      // Update status to "Completed"
      const statusRange = `${config.GOOGLE_SHEET_NAME}!F${id}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range: statusRange,
        valueInputOption: 'RAW',
        resource: {
          values: [['Completed']],
        },
      });

      // Update value and description
      const updateRange = `${config.GOOGLE_SHEET_NAME}!J${id}:K${id}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range: updateRange,
        valueInputOption: 'RAW',
        resource: {
          values: [[appraisalValue, description]],
        },
      });

      res.json({ success: true, message: 'Appraisal completed successfully.' });
    } catch (error) {
      console.error('Error completing appraisal:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = AppraisalController;