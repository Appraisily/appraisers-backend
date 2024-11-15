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
router.get('/:id/list-edit', authenticate, (req, res) => appraisalController.getDetailsForEdit(req, res));

// Process steps endpoints
router.post('/:id/set-value', authenticate, validateSetValue, (req, res) => appraisalController.setValue(req, res));
router.post('/:id/merge-descriptions', authenticate, (req, res) => appraisalController.mergeDescriptions(req, res));
router.post('/:id/update-title', authenticate, (req, res) => appraisalController.updateTitle(req, res));
router.post('/:id/insert-template', authenticate, (req, res) => appraisalController.insertTemplate(req, res));
router.post('/:id/build-pdf', authenticate, (req, res) => appraisalController.buildPdf(req, res));
router.post('/:id/send-email', authenticate, (req, res) => appraisalController.sendEmail(req, res));
router.post('/:id/complete', authenticate, validateSetValue, (req, res) => appraisalController.complete(req, res));

// Worker endpoint
router.post('/process-worker', validateWorker, (req, res) => appraisalController.processWorker(req, res));

// Complete process (starts the workflow)
router.post('/:id/complete-process', authenticate, validateSetValue, (req, res) => appraisalController.completeProcess(req, res));

module.exports = router;