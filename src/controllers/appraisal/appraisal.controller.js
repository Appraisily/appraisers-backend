const { 
  sheetsService, 
  wordpressService,
  pubsubService,
  emailService,
  pdfService 
} = require('../../services');
const { config } = require('../../config');
const { getImageUrl } = require('../../utils/getImageUrl');

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

  static async getCompleted(req, res) {
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

  static async generatePdf(req, res) {
    try {
      const { id } = req.params;
      const result = await pdfService.generatePdf(id);

      res.json({
        success: true,
        message: 'PDF generated successfully',
        pdfLink: result.pdfLink,
        docLink: result.docLink
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
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
        type: 'COMPLETE_APPRAISAL',
        data: {
          id,
          appraisalValue,
          description
        }
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
}

module.exports = {
  getAppraisals: AppraisalController.getAppraisals,
  getCompleted: AppraisalController.getCompleted,
  getDetails: AppraisalController.getDetails,
  getDetailsForEdit: AppraisalController.getDetailsForEdit,
  setValue: AppraisalController.setValue,
  generatePdf: AppraisalController.generatePdf,
  completeProcess: AppraisalController.completeProcess,
  sendEmail: AppraisalController.sendEmail
};