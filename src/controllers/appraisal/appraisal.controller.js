const { 
  sheetsService, 
  wordpressService,
  pubsubService,
  emailService 
} = require('../../services');
const { config } = require('../../config');
const { getImageUrl } = require('../../utils/getImageUrl');
const appraisalService = require('./appraisal.service');

class AppraisalController {
  // Get all pending appraisals
  async getAppraisals(req, res) {
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

  // Get completed appraisals
  async getCompleted(req, res) {
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

  // Get details for a specific appraisal
  async getDetails(req, res) {
    const { id } = req.params;
    try {
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

      // Get WordPress data
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

  // Get details for editing
  async getDetailsForEdit(req, res) {
    const { id } = req.params;
    try {
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

      // Get WordPress data
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

  // Process steps
  async setValue(req, res) {
    try {
      await appraisalService.setValue(req.params.id, req.body);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  async mergeDescriptions(req, res) {
    try {
      await appraisalService.mergeDescriptions(req.params.id, req.body.description);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  async updateTitle(req, res) {
    try {
      await appraisalService.updateTitle(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  async insertTemplate(req, res) {
    try {
      await appraisalService.insertTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  async buildPdf(req, res) {
    try {
      await appraisalService.buildPdf(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  async sendEmail(req, res) {
    try {
      await appraisalService.sendEmail(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  async complete(req, res) {
    try {
      const { appraisalValue, description } = req.body;
      await appraisalService.complete(req.params.id, appraisalValue, description);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  async processWorker(req, res) {
    try {
      const { id, appraisalValue, description } = req.body;
      await appraisalService.processWorker(id, appraisalValue, description);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  async completeProcess(req, res) {
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
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }
}

module.exports = new AppraisalController();