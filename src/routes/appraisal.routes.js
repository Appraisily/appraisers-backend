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
  processWorker,
  completeProcess,
  setValue
} = require('../controllers/appraisal.controller');

// Get all appraisals
router.get('/', authenticate, getAppraisals);

// Get completed appraisals
router.get('/completed', authenticate, getCompletedAppraisals);

// Get specific appraisal details
router.get('/:id/list', authenticate, getAppraisalDetails);

// Get appraisal details for editing
router.get('/:id/list-edit', authenticate, getAppraisalDetailsForEdit);

// Set appraisal value
router.post('/:id/set-value', authenticate, validateSetValue, setValue);

// Process worker endpoint
router.post('/process-worker', validateWorker, processWorker);

// Complete process
router.post('/:id/complete-process', authenticate, validateSetValue, completeProcess);

module.exports = router;