const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const { validateSetValue } = require('../middleware/validateSetValue');
const { validateWorker } = require('../middleware/validateWorker');
const {
  getAppraisals,
  getCompletedAppraisals,
  getAppraisalDetails,
  processWorker,
  completeProcess
} = require('../controllers/appraisal.controller');

// Get all appraisals
router.get('/', authenticate, getAppraisals);

// Get completed appraisals
router.get('/completed', authenticate, getCompletedAppraisals);

// Get specific appraisal details
router.get('/:id/list', authenticate, getAppraisalDetails);

// Process worker endpoint
router.post('/process-worker', validateWorker, processWorker);

// Complete process
router.post('/:id/complete-process', authenticate, validateSetValue, completeProcess);

module.exports = router;