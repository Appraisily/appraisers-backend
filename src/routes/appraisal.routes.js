const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const { validateSetValue } = require('../middleware/validateSetValue');
const { validateWorker } = require('../middleware/validateWorker');
const {
  getAppraisals,
  getCompletedAppraisals,
  getAppraisalDetails,
  getAppraisalDetailsForEdit,
  updateAcfField,
  setAppraisalValue,
  completeProcess,
  processWorker,
  getSessionId,
  saveLinks,
  updateLinks,
  insertTemplate,
  updatePostTitle,
  sendEmailToCustomer,
  completeAppraisal
} = require('../controllers/appraisal.controller');

// Get all appraisals
router.get('/', authenticate, getAppraisals);

// Get completed appraisals
router.get('/completed', authenticate, getCompletedAppraisals);

// Get specific appraisal details
router.get('/:id/list', authenticate, getAppraisalDetails);
router.get('/:id/list-edit', authenticate, getAppraisalDetailsForEdit);

// Update appraisal
router.put('/:id/update-acf-field', authenticate, updateAcfField);
router.post('/:id/set-value', authenticate, validateSetValue, setAppraisalValue);
router.post('/:id/complete-process', authenticate, completeProcess);

// Worker endpoint
router.post('/process-worker', validateWorker, processWorker);

// Session and links management
router.post('/get-session-id', authenticate, getSessionId);
router.post('/:id/save-links', authenticate, saveLinks);
router.post('/:id/update-links', authenticate, updateLinks);

// Template and content management
router.post('/:id/insert-template', authenticate, insertTemplate);
router.post('/:id/update-title', authenticate, updatePostTitle);

// Email and completion
router.post('/:id/send-email', authenticate, sendEmailToCustomer);
router.post('/:id/complete', authenticate, completeAppraisal);

module.exports = router;