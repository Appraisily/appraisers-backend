const express = require('express');
const router = express.Router();
const AppraisalController = require('../controllers/appraisalController');
const authenticate = require('../middleware/authenticate');
const validateWorker = require('../middleware/validateWorker');

// Get all appraisals
router.get('/', authenticate, AppraisalController.getAppraisals);

// Get specific appraisal details
router.get('/:id/list', authenticate, AppraisalController.getAppraisalDetails);

// Get appraisal details for editing
router.get('/:id/list-edit', authenticate, AppraisalController.getAppraisalDetailsForEdit);

// Complete appraisal process
router.post('/:id/complete-process', authenticate, AppraisalController.completeProcess);

// Worker endpoint to process appraisals
router.post('/process-worker', validateWorker, AppraisalController.processWorker);

module.exports = router;