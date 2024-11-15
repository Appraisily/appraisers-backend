const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const { validateSetValue } = require('../middleware/validateSetValue');
const { validateWorker } = require('../middleware/validateWorker');
const appraisalController = require('../controllers/appraisal/appraisal.controller');

// Get all appraisals
router.get('/', authenticate, (req, res) => appraisalController.getAppraisals(req, res));

// Get completed appraisals
router.get('/completed', authenticate, (req, res) => appraisalController.getCompleted(req, res));

// Get specific appraisal details
router.get('/:id/list', authenticate, (req, res) => appraisalController.getDetails(req, res));

// Get appraisal details for editing
router.get('/:id/list-edit', authenticate, (req, res) => appraisalController.getDetails(req, res, true));

// Set appraisal value
router.post('/:id/set-value', authenticate, validateSetValue, (req, res) => appraisalController.setValue(req, res));

// Process worker endpoint
router.post('/process-worker', validateWorker, (req, res) => appraisalController.processWorker(req, res));

// Complete process
router.post('/:id/complete-process', authenticate, validateSetValue, (req, res) => appraisalController.completeProcess(req, res));

module.exports = router;