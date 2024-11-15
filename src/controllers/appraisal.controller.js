const { 
  sheetsService, 
  pubsubService,
  emailService,
  wordpressService
} = require('../services');
const { config } = require('../config');
const { getImageUrl } = require('../utils/getImageUrl');

class AppraisalController {
  static async getAppraisals(req, res) {
    try {
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!A2:H`
      );

      const appraisals = (values || []).map((row, index) => ({
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
      res.status(500).json({ 
        success: false, 
        message: 'Error getting appraisals.' 
      });
    }
  }

  static async getCompletedAppraisals(req, res) {
    try {
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        'Completed Appraisals!A2:H'
      );

      const completedAppraisals = (values || []).map((row, index) => ({
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
      res.status(500).json({ 
        success: false, 
        message: 'Error getting completed appraisals.' 
      });
    }
  }

  static async getAppraisalDetails(req, res) {
    const { id } = req.params;
    try {
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!A${id}:I${id}`
      );

      const row = values?.[0];
      if (!row) {
        return res.status(404).json({ 
          success: false, 
          message: 'Appraisal not found.' 
        });
      }

      const wordpressUrl = row[6];
      const parsedUrl = new URL(wordpressUrl);
      const postId = parsedUrl.searchParams.get('post');

      if (!postId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Could not extract WordPress post ID.' 
        });
      }

      const wpData = await wordpressService.getPost(postId);
      const acfFields = wpData.acf || {};

      const appraisal = {
        id,
        date: row[0] || '',
        appraisalType: row[1] || '',
        identifier: row[2] || '',
        status: row[5] || '',
        wordpressUrl: row[6] || '',
        iaDescription: row[7] || '',
        customerDescription: row[8] || '',
        images: {
          main: await getImageUrl(acfFields.main),
          age: await getImageUrl(acfFields.age),
          signature: await getImageUrl(acfFields.signature),
        }
      };

      res.json(appraisal);
    } catch (error) {
      console.error('Error getting appraisal details:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error getting appraisal details.' 
      });
    }
  }

  static async getAppraisalDetailsForEdit(req, res) {
    const { id } = req.params;
    try {
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!A${id}:I${id}`
      );

      const row = values?.[0];
      if (!row) {
        return res.status(404).json({ 
          success: false, 
          message: 'Appraisal not found.' 
        });
      }

      const wordpressUrl = row[6];
      const parsedUrl = new URL(wordpressUrl);
      const postId = parsedUrl.searchParams.get('post');

      if (!postId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Could not extract WordPress post ID.' 
        });
      }

      const wpData = await wordpressService.getPost(postId);
      const acfFields = wpData.acf || {};

      const appraisal = {
        id,
        date: row[0] || '',
        appraisalType: row[1] || '',
        identifier: row[2] || '',
        status: row[5] || '',
        wordpressUrl: row[6] || '',
        iaDescription: row[7] || '',
        customerDescription: row[8] || '',
        acfFields,
        images: {
          main: await getImageUrl(acfFields.main),
          age: await getImageUrl(acfFields.age),
          signature: await getImageUrl(acfFields.signature),
        }
      };

      res.json(appraisal);
    } catch (error) {
      console.error('Error getting appraisal details for edit:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error getting appraisal details.' 
      });
    }
  }

  static async updateAcfField(req, res) {
    const { id } = req.params;
    const { fieldName, fieldValue } = req.body;

    if (!fieldName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Field name is required.' 
      });
    }

    try {
      const post = await wordpressService.getPost(id);
      const acfFields = post.acf || {};
      acfFields[fieldName] = fieldValue;

      await wordpressService.updatePost(id, { acf: acfFields });

      res.json({ 
        success: true, 
        message: `Field '${fieldName}' updated successfully.` 
      });
    } catch (error) {
      console.error('Error updating ACF field:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  static async setAppraisalValue(req, res) {
    const { id } = req.params;
    const { appraisalValue, description, isEdit } = req.body;

    try {
      const sheetName = isEdit ? config.EDIT_SHEET_NAME : config.GOOGLE_SHEET_NAME;

      // Update Google Sheets
      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${sheetName}!J${id}:K${id}`,
        [[appraisalValue, description]]
      );

      // Get WordPress post ID
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${sheetName}!G${id}`
      );

      const wordpressUrl = values?.[0]?.[0];
      if (!wordpressUrl) {
        throw new Error('WordPress URL not found');
      }

      const postId = new URL(wordpressUrl).searchParams.get('post');
      if (!postId) {
        throw new Error('WordPress post ID not found');
      }

      // Update WordPress ACF
      await wordpressService.updatePost(postId, {
        acf: { value: appraisalValue }
      });

      res.json({ 
        success: true, 
        message: 'Appraisal value set successfully.' 
      });
    } catch (error) {
      console.error('Error setting appraisal value:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  static async completeProcess(req, res) {
    const { id } = req.params;
    const { appraisalValue, description } = req.body;

    if (!appraisalValue || !description) {
      return res.status(400).json({ 
        success: false, 
        message: 'Appraisal value and description are required.' 
      });
    }

    try {
      await pubsubService.publishMessage('appraisal-tasks', {
        id,
        appraisalValue,
        description,
      });

      res.json({ 
        success: true, 
        message: 'Appraisal process started successfully.' 
      });
    } catch (error) {
      console.error('Error starting appraisal process:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  static async getSessionId(req, res) {
    const { postId } = req.body;

    if (!postId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Post ID is required.' 
      });
    }

    try {
      const post = await wordpressService.getPost(postId);
      const sessionId = post.acf?.session_id;

      if (!sessionId) {
        return res.status(404).json({ 
          success: false, 
          message: 'Session ID not found.' 
        });
      }

      res.json({ 
        success: true, 
        session_ID: sessionId 
      });
    } catch (error) {
      console.error('Error getting session ID:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  static async saveLinks(req, res) {
    const { id } = req.params;
    const { pdfLink, docLink } = req.body;

    if (!pdfLink || !docLink) {
      return res.status(400).json({ 
        success: false, 
        message: 'PDF and Doc links are required.' 
      });
    }

    try {
      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!M${id}:N${id}`,
        [[pdfLink, docLink]]
      );

      res.json({ 
        success: true, 
        message: 'Links saved successfully.' 
      });
    } catch (error) {
      console.error('Error saving links:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  static async insertTemplate(req, res) {
    const { id } = req.params;

    try {
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!A${id}:G${id}`
      );

      const row = values?.[0];
      if (!row) {
        throw new Error('Appraisal not found');
      }

      const appraisalType = row[1] || 'RegularArt';
      const wordpressUrl = row[6];

      if (!wordpressUrl) {
        throw new Error('WordPress URL not found');
      }

      const postId = new URL(wordpressUrl).searchParams.get('post');
      if (!postId) {
        throw new Error('Could not extract WordPress post ID');
      }

      const post = await wordpressService.getPost(postId);
      let content = post.content?.rendered || '';

      if (!content.includes('[pdf_download]')) {
        content += '\n[pdf_download]';
      }

      if (!content.includes(`[AppraisalTemplates type="${appraisalType}"]`)) {
        content += `\n[AppraisalTemplates type="${appraisalType}"]`;
      }

      await wordpressService.updatePost(postId, {
        content,
        acf: { shortcodes_inserted: true }
      });

      res.json({ 
        success: true, 
        message: 'Template inserted successfully.' 
      });
    } catch (error) {
      console.error('Error inserting template:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  static async updatePostTitle(req, res) {
    const { id } = req.params;

    try {
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!A${id}:L${id}`
      );

      const row = values?.[0];
      if (!row) {
        throw new Error('Appraisal not found');
      }

      const wordpressUrl = row[6];
      const blendedDescription = row[11];

      if (!wordpressUrl || !blendedDescription) {
        throw new Error('Required data not found');
      }

      const postId = new URL(wordpressUrl).searchParams.get('post');
      if (!postId) {
        throw new Error('Could not extract WordPress post ID');
      }

      await wordpressService.updatePost(postId, {
        title: blendedDescription
      });

      res.json({ 
        success: true, 
        message: 'Post title updated successfully.' 
      });
    } catch (error) {
      console.error('Error updating post title:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  static async sendEmailToCustomer(req, res) {
    const { id } = req.params;

    try {
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!A${id}:N${id}`
      );

      const row = values?.[0];
      if (!row) {
        throw new Error('Appraisal not found');
      }

      const customerEmail = row[3];
      const customerName = row[4];
      const wordpressUrl = row[6];
      const appraisalValue = row[9];
      const description = row[10];
      const pdfLink = row[12];

      if (!customerEmail || !wordpressUrl) {
        throw new Error('Required data not found');
      }

      const postId = new URL(wordpressUrl).searchParams.get('post');
      if (!postId) {
        throw new Error('Could not extract WordPress post ID');
      }

      const post = await wordpressService.getPost(postId);
      const publicUrl = post.link;

      await emailService.sendAppraisalCompletedEmail(customerEmail, customerName, {
        value: appraisalValue,
        description,
        pdfLink,
        publicUrl
      });

      res.json({ 
        success: true, 
        message: 'Email sent successfully.' 
      });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  static async updateLinks(req, res) {
    const { id } = req.params;
    const { postId } = req.body;

    if (!postId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Post ID is required.' 
      });
    }

    try {
      const post = await wordpressService.getPost(postId);
      const pdfLink = post.acf?.pdflink;
      const docLink = post.acf?.doclink;

      if (!pdfLink || !docLink) {
        throw new Error('PDF or Doc link not found');
      }

      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!M${id}:N${id}`,
        [[pdfLink, docLink]]
      );

      res.json({ 
        success: true, 
        message: 'Links updated successfully.' 
      });
    } catch (error) {
      console.error('Error updating links:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  static async completeAppraisal(req, res) {
    const { id } = req.params;
    const { appraisalValue, description } = req.body;

    try {
      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!F${id}`,
        [['Completed']]
      );

      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!J${id}:K${id}`,
        [[appraisalValue, description]]
      );

      res.json({ 
        success: true, 
        message: 'Appraisal completed successfully.' 
      });
    } catch (error) {
      console.error('Error completing appraisal:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }
}

module.exports = AppraisalController;