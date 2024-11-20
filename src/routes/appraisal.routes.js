const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const { validateSetValue } = require('../middleware/validateSetValue');
const appraisalController = require('../controllers/appraisal/appraisal.controller');
const { validateSharedSecret } = require('../middleware/validateSharedSecret');

// Existing routes
router.get('/', authenticate, appraisalController.getAppraisals);
router.get('/completed', authenticate, appraisalController.getCompleted);
router.get('/:id/list', authenticate, appraisalController.getDetails);

router.post('/:id/set-value', authenticate, validateSetValue, appraisalController.setValue);
router.post('/:id/merge-descriptions', authenticate, appraisalController.mergeDescriptions);
router.post('/:id/update-title', authenticate, appraisalController.updateTitle);
router.post('/:id/insert-template', authenticate, appraisalController.insertTemplate);
router.post('/:id/build-pdf', authenticate, appraisalController.buildPdf);
router.post('/:id/send-email', authenticate, appraisalController.sendEmail);
router.post('/:id/complete', authenticate, validateSetValue, appraisalController.complete);

router.post('/process-worker', authenticate, appraisalController.processWorker);
router.post('/:id/complete-process', authenticate, validateSetValue, appraisalController.completeProcess);

// New route for processing appraisal requests
router.post('/process-request', validateSharedSecret, appraisalController.processAppraisalRequest);

module.exports = router;