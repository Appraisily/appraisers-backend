const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const { validateSetValue } = require('../middleware/validateSetValue');
const { validateWorker } = require('../middleware/validateWorker');
const appraisalController = require('../controllers/appraisal/appraisal.controller');
const { API_ROUTES } = require('../constants/routes');

// Remove /api prefix as it's added in index.js
router.get('/appraisals', authenticate, appraisalController.getAppraisals);
router.get('/appraisals/completed', authenticate, appraisalController.getCompleted);
router.get('/appraisals/:id/list', authenticate, appraisalController.getDetails);
router.get('/appraisals/:id/list-edit', authenticate, appraisalController.getDetailsForEdit);

router.post('/appraisals/:id/set-value', authenticate, validateSetValue, appraisalController.setValue);
router.post('/appraisals/:id/merge-descriptions', authenticate, appraisalController.mergeDescriptions);
router.post('/appraisals/:id/update-title', authenticate, appraisalController.updateTitle);
router.post('/appraisals/:id/insert-template', authenticate, appraisalController.insertTemplate);
router.post('/appraisals/:id/build-pdf', authenticate, appraisalController.buildPdf);
router.post('/appraisals/:id/send-email', authenticate, appraisalController.sendEmail);
router.post('/appraisals/:id/complete', authenticate, validateSetValue, appraisalController.complete);

router.post('/appraisals/process-worker', validateWorker, appraisalController.processWorker);
router.post('/appraisals/:id/complete-process', authenticate, validateSetValue, appraisalController.completeProcess);

module.exports = router;