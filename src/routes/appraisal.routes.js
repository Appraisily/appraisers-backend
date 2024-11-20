const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const { validateSharedSecret } = require('../middleware/validateSharedSecret');
const { validateSetValue } = require('../middleware/validateSetValue');
const appraisalController = require('../controllers/appraisal/appraisal.controller');
const ProcessRequestController = require('../controllers/appraisal/processRequest.controller');

// List and View routes
router.get('/', authenticate, appraisalController.getAppraisals);
router.get('/completed', authenticate, appraisalController.getCompleted);
router.get('/:id/list', authenticate, appraisalController.getDetails);
router.get('/:id/list-edit', authenticate, appraisalController.getDetailsForEdit);

// Process and Update routes
router.post('/process-request', validateSharedSecret, ProcessRequestController.processRequest);
router.post('/:id/set-value', authenticate, validateSetValue, appraisalController.setValue);
router.post('/:id/merge-descriptions', authenticate, appraisalController.mergeDescriptions);
router.post('/:id/update-title', authenticate, appraisalController.updateTitle);
router.post('/:id/insert-template', authenticate, appraisalController.insertTemplate);
router.post('/:id/build-pdf', authenticate, appraisalController.buildPdf);
router.post('/:id/send-email', authenticate, appraisalController.sendEmail);
router.post('/:id/complete', authenticate, validateSetValue, appraisalController.complete);
router.post('/process-worker', authenticate, appraisalController.processWorker);
router.post('/:id/complete-process', authenticate, validateSetValue, appraisalController.completeProcess);

module.exports = router;