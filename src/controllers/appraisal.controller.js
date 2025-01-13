const { 
  sheetsService, 
  wordpressService,
  pubsubService,
  emailService 
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
      res.status(500).json({ success: false, message: 'Error getting appraisals.' });
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
      res.status(500).json({ success: false, message: 'Error getting completed appraisals.' });
    }
  }

  static async getDetails(req, res) {
    const { id } = req.params;
    try {
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!A${id}:K${id}`
      );

      const row = values[0];
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
        value: row[9] || '',
        appraisersDescription: row[10] || ''
      };

      const postId = new URL(appraisal.wordpressUrl).searchParams.get('post');
      if (!postId) {
        throw new Error('Invalid WordPress URL');
      }

      const wpData = await wordpressService.getPost(postId);
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

  static async getDetailsForEdit(req, res) {
    const { id } = req.params;
    try {
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!A${id}:K${id}`
      );

      const row = values[0];
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
        value: row[9] || '',
        appraisersDescription: row[10] || ''
      };

      const postId = new URL(appraisal.wordpressUrl).searchParams.get('post');
      if (!postId) {
        throw new Error('Invalid WordPress URL');
      }

      const wpData = await wordpressService.getPost(postId);
      appraisal.acfFields = wpData.acf || {};
      appraisal.images = {
        main: await getImageUrl(appraisal.acfFields.main),
        age: await getImageUrl(appraisal.acfFields.age),
        signature: await getImageUrl(appraisal.acfFields.signature),
      };

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

  static async setValue(req, res) {
    const { id } = req.params;
    const { appraisalValue, description, isEdit } = req.body;

    try {
      const sheetName = isEdit ? config.EDIT_SHEET_NAME : config.GOOGLE_SHEET_NAME;

      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${sheetName}!J${id}:K${id}`,
        [[appraisalValue, description]]
      );

      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${sheetName}!G${id}`
      );

      const wordpressUrl = values[0][0];
      const postId = new URL(wordpressUrl).searchParams.get('post');

      await wordpressService.updatePost(postId, {
        acf: { value: appraisalValue }
      });

      res.json({ success: true, message: 'Appraisal value set successfully.' });
    } catch (error) {
      console.error('Error setting appraisal value:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async completeProcess(req, res) {
    const { id } = req.params;
    const { appraisalValue, description } = req.body;

    try {
      await pubsubService.publishMessage('appraisal-tasks', {
        type: 'COMPLETE_APPRAISAL',
        data: {
          id,
          appraisalValue,
          description
        }
      });

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
      const wpData = await wordpressService.getPost(postId);
      const session_ID = wpData.acf?.session_id;

      if (!session_ID) {
        return res.status(404).json({ success: false, message: 'Session ID not found.' });
      }

      res.json({ success: true, session_ID });
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
      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!M${id}:N${id}`,
        [[pdfLink, docLink]]
      );

      res.json({ success: true, message: 'Links saved successfully.' });
    } catch (error) {
      console.error('Error saving links:', error);
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
      const wpData = await wordpressService.getPost(postId);
      const pdfLink = wpData.acf?.pdflink;
      const docLink = wpData.acf?.doclink;

      if (!pdfLink || !docLink) {
        throw new Error('PDF or Doc link not found.');
      }

      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!M${id}:N${id}`,
        [[pdfLink, docLink]]
      );

      res.json({ success: true, message: 'Links updated successfully.' });
    } catch (error) {
      console.error('Error updating links:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async complete(req, res) {
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

      res.json({ success: true, message: 'Appraisal completed successfully.' });
    } catch (error) {
      console.error('Error completing appraisal:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = AppraisalController;