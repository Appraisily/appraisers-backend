const { 
  sheetsService, 
  pubsubService, 
  wordpressService 
} = require('../../services');
const { config } = require('../../config');
const { getImageUrl } = require('../../utils/getImageUrl');

async function getAppraisals(req, res) {
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

async function getCompleted(req, res) {
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

async function getDetails(req, res) {
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

async function getDetailsForEdit(req, res) {
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

async function setValue(req, res) {
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

async function processWorker(req, res) {
  const { id, appraisalValue, description } = req.body;

  if (!id || !appraisalValue || !description) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  try {
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

async function completeProcess(req, res) {
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

module.exports = {
  getAppraisals,
  getCompleted,
  getDetails,
  getDetailsForEdit,
  setValue,
  processWorker,
  completeProcess
};