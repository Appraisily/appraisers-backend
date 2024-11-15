const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const { validateSetValue } = require('../middleware/validateSetValue');
const { validateWorker } = require('../middleware/validateWorker');
const appraisalController = require('../controllers/appraisal.controller');

// Get all appraisals
router.get('/', authenticate, appraisalController.getAppraisals);

// Get completed appraisals
router.get('/completed', authenticate, appraisalController.getCompletedAppraisals);

// Get specific appraisal details
router.get('/:id/list', authenticate, appraisalController.getAppraisalDetails);

// Get appraisal details for editing
router.get('/:id/list-edit', authenticate, appraisalController.getAppraisalDetailsForEdit);

// Set appraisal value
router.post('/:id/set-value', authenticate, validateSetValue, appraisalController.setValue);

// Process worker endpoint
router.post('/process-worker', validateWorker, appraisalController.processWorker);

// Complete process
router.post('/:id/complete-process', authenticate, validateSetValue, appraisalController.completeProcess);

module.exports = router;