const { 
  sheetsService, 
  wordpressService,
  pubsubService,
  emailService,
  openaiService 
} = require('../../services');
const { config } = require('../../config');
const { getImageUrl } = require('../../utils/getImageUrl');

class AppraisalController {
  static async getAppraisals(req, res) {
    try {
      const appraisals = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!A2:H`
      );

      const formattedAppraisals = (appraisals || []).map((row, index) => ({
        id: index + 2,
        date: row[0] || '',
        appraisalType: row[1] || '',
        identifier: row[2] || '',
        status: row[5] || '',
        wordpressUrl: row[6] || '',
        iaDescription: row[7] || '',
      }));

      res.json(formattedAppraisals);
    } catch (error) {
      console.error('Error getting appraisals:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error getting appraisals.' 
      });
    }
  }

  static async getCompleted(req, res) {
    try {
      const completedAppraisals = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        'Completed Appraisals!A2:H'
      );

      const formattedAppraisals = (completedAppraisals || []).map((row, index) => ({
        id: index + 2,
        date: row[0] || '',
        appraisalType: row[1] || '',
        identifier: row[2] || '',
        status: row[5] || '',
        wordpressUrl: row[6] || '',
        iaDescription: row[7] || '',
      }));

      res.json(formattedAppraisals);
    } catch (error) {
      console.error('Error getting completed appraisals:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error getting completed appraisals.' 
      });
    }
  }

  static async getDetails(req, res) {
    try {
      const { id } = req.params;
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!A${id}:I${id}`
      );

      const row = values[0];
      if (!row) {
        return res.status(404).json({ 
          success: false, 
          message: 'Appraisal not found.' 
        });
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
      res.status(500).json({ 
        success: false, 
        message: 'Error getting appraisal details.' 
      });
    }
  }

  static async getDetailsForEdit(req, res) {
    try {
      const { id } = req.params;
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!A${id}:I${id}`
      );

      const row = values[0];
      if (!row) {
        return res.status(404).json({ 
          success: false, 
          message: 'Appraisal not found.' 
        });
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
      res.status(500).json({ 
        success: false, 
        message: 'Error getting appraisal details.' 
      });
    }
  }

  static async setValue(req, res) {
    try {
      const { id } = req.params;
      const { appraisalValue, description, isEdit } = req.body;

      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${isEdit ? config.EDIT_SHEET_NAME : config.GOOGLE_SHEET_NAME}!J${id}:K${id}`,
        [[appraisalValue, description]]
      );

      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${isEdit ? config.EDIT_SHEET_NAME : config.GOOGLE_SHEET_NAME}!G${id}`
      );

      const wordpressUrl = values[0][0];
      const postId = new URL(wordpressUrl).searchParams.get('post');

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

  static async mergeDescriptions(req, res) {
    try {
      const { id } = req.params;
      const { description } = req.body;

      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!H${id}`
      );

      const iaDescription = values[0][0];
      if (!iaDescription) {
        throw new Error('IA description not found');
      }

      const mergedDescription = await openaiService.mergeDescriptions(description, iaDescription);

      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!L${id}`,
        [[mergedDescription]]
      );

      res.json({ 
        success: true, 
        description: mergedDescription 
      });
    } catch (error) {
      console.error('Error merging descriptions:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  static async updateTitle(req, res) {
    try {
      const { id } = req.params;
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!A${id}:L${id}`
      );

      const row = values[0];
      if (!row) {
        throw new Error('Appraisal not found');
      }

      const wordpressUrl = row[6];
      const blendedDescription = row[11];

      if (!wordpressUrl || !blendedDescription) {
        throw new Error('Required data missing');
      }

      const postId = new URL(wordpressUrl).searchParams.get('post');
      if (!postId) {
        throw new Error('Invalid WordPress URL');
      }

      await wordpressService.updatePost(postId, {
        title: blendedDescription
      });

      res.json({ 
        success: true, 
        message: 'Title updated successfully.' 
      });
    } catch (error) {
      console.error('Error updating title:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  static async insertTemplate(req, res) {
    try {
      const { id } = req.params;
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!A${id}:G${id}`
      );

      const row = values[0];
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
        throw new Error('Invalid WordPress URL');
      }

      const wpData = await wordpressService.getPost(postId);
      let content = wpData.content?.rendered || '';

      if (!content.includes('[pdf_download]')) {
        content += '\n[pdf_download]';
      }

      if (!content.includes(`[AppraisalTemplates type="${appraisalType}"]`)) {
        content += `\n[AppraisalTemplates type="${appraisalType}"]`;
      }

      await wordpressService.updatePost(postId, {
        content,
        acf: {
          shortcodes_inserted: true
        }
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

  static async buildPdf(req, res) {
    try {
      const { id } = req.params;
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!A${id}:G${id}`
      );

      const row = values[0];
      if (!row) {
        throw new Error('Appraisal not found');
      }

      const wordpressUrl = row[6];
      const postId = new URL(wordpressUrl).searchParams.get('post');

      const wpData = await wordpressService.getPost(postId);
      const session_ID = wpData.acf?.session_id;
      if (!session_ID) {
        throw new Error('session_ID not found');
      }

      const { pdfLink, docLink } = await wordpressService.generatePdf(postId, session_ID);

      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!M${id}:N${id}`,
        [[pdfLink, docLink]]
      );

      res.json({ 
        success: true, 
        message: 'PDF built successfully.' 
      });
    } catch (error) {
      console.error('Error building PDF:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  static async sendEmail(req, res) {
    try {
      const { id } = req.params;
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!A${id}:N${id}`
      );

      const row = values[0];
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
        throw new Error('Required data missing');
      }

      await emailService.sendAppraisalCompletedEmail(customerEmail, customerName, {
        value: appraisalValue,
        description: description,
        pdfLink: pdfLink,
        wordpressUrl: wordpressUrl
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

  static async complete(req, res) {
    try {
      const { id } = req.params;
      const { appraisalValue, description } = req.body;

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

  static async processWorker(req, res) {
    try {
      const { id, appraisalValue, description } = req.body;

      if (!id || !appraisalValue || !description) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!J${id}:K${id}`,
        [[appraisalValue, description]]
      );

      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!G${id}`
      );

      const wordpressUrl = values[0][0];
      const postId = new URL(wordpressUrl).searchParams.get('post');

      await wordpressService.updatePost(postId, {
        acf: { value: appraisalValue }
      });

      res.json({
        success: true,
        message: 'Worker process completed successfully'
      });
    } catch (error) {
      console.error('Worker process error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async completeProcess(req, res) {
    try {
      const { id } = req.params;
      const { appraisalValue, description } = req.body;

      await pubsubService.publishMessage('appraisal-tasks', {
        id,
        appraisalValue,
        description
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
}

module.exports = {
  getAppraisals: AppraisalController.getAppraisals,
  getCompleted: AppraisalController.getCompleted,
  getDetails: AppraisalController.getDetails,
  getDetailsForEdit: AppraisalController.getDetailsForEdit,
  setValue: AppraisalController.setValue,
  mergeDescriptions: AppraisalController.mergeDescriptions,
  updateTitle: AppraisalController.updateTitle,
  insertTemplate: AppraisalController.insertTemplate,
  buildPdf: AppraisalController.buildPdf,
  sendEmail: AppraisalController.sendEmail,
  complete: AppraisalController.complete,
  processWorker: AppraisalController.processWorker,
  completeProcess: AppraisalController.completeProcess
};