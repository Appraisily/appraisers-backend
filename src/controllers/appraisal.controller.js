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

      const appraisals = values.map((row, index) => ({
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

      const completedAppraisals = values.map((row, index) => ({
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

      if (!values || !values[0]) {
        return res.status(404).json({ 
          success: false, 
          message: 'Appraisal not found.' 
        });
      }

      const row = values[0];
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
      const postId = new URL(wordpressUrl).searchParams.get('post');

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

  static async getAppraisalDetailsForEdit(req, res) {
    const { id } = req.params;
    try {
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!A${id}:I${id}`
      );

      if (!values || !values[0]) {
        return res.status(404).json({ 
          success: false, 
          message: 'Appraisal not found.' 
        });
      }

      const row = values[0];
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
      const postId = new URL(wordpressUrl).searchParams.get('post');

      const wpData = await wordpressService.getPost(postId);
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
      res.status(500).json({ 
        success: false, 
        message: 'Error getting appraisal details.' 
      });
    }
  }

  static async setValue(req, res) {
    const { id } = req.params;
    const { appraisalValue, description } = req.body;

    try {
      // Update Google Sheets
      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!J${id}:K${id}`,
        [[appraisalValue, description]]
      );

      // Get WordPress URL
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!G${id}`
      );

      const wordpressUrl = values[0][0];
      const postId = new URL(wordpressUrl).searchParams.get('post');

      // Update WordPress
      await wordpressService.updatePost(postId, {
        acf: { value: appraisalValue }
      });

      res.json({
        success: true,
        message: 'Appraisal value updated successfully'
      });
    } catch (error) {
      console.error('Error updating appraisal value:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error updating appraisal value'
      });
    }
  }

  static async completeProcess(req, res) {
    const { id } = req.params;
    const { appraisalValue, description } = req.body;

    try {
      const task = {
        type: 'COMPLETE_APPRAISAL',
        data: {
          id,
          appraisalValue,
          description
        }
      };

      await pubsubService.publishMessage('appraisal-tasks', task);

      res.json({ 
        success: true, 
        message: 'Appraisal process started successfully.' 
      });
    } catch (error) {
      console.error('Error starting appraisal process:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Error starting appraisal process' 
      });
    }
  }

  static async processWorker(req, res) {
    const { id, appraisalValue, description } = req.body;

    try {
      // Update sheets with value and description
      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!J${id}:K${id}`,
        [[appraisalValue, description]]
      );

      // Get WordPress URL
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!A${id}:N${id}`
      );

      const row = values[0];
      const wordpressUrl = row[6];
      const customerEmail = row[3];
      const customerName = row[4];
      const postId = new URL(wordpressUrl).searchParams.get('post');

      // Update WordPress
      const wpData = await wordpressService.updatePost(postId, {
        acf: { value: appraisalValue }
      });

      // Send email
      if (customerEmail) {
        await emailService.sendAppraisalCompletedEmail(
          customerEmail,
          customerName,
          {
            value: appraisalValue,
            description: description,
            pdfLink: wpData.acf?.pdflink,
            publicUrl: wpData.link
          }
        );
      }

      // Mark as completed
      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!F${id}`,
        [['Completed']]
      );

      res.json({ 
        success: true, 
        message: 'Appraisal processed successfully' 
      });
    } catch (error) {
      console.error('Error processing appraisal:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Error processing appraisal' 
      });
    }
  }
}

module.exports = {
  getAppraisals: AppraisalController.getAppraisals,
  getCompletedAppraisals: AppraisalController.getCompletedAppraisals,
  getAppraisalDetails: AppraisalController.getAppraisalDetails,
  getAppraisalDetailsForEdit: AppraisalController.getAppraisalDetailsForEdit,
  setValue: AppraisalController.setValue,
  completeProcess: AppraisalController.completeProcess,
  processWorker: AppraisalController.processWorker
};