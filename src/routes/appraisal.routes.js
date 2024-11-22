const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const appraisalController = require('../controllers/appraisal/appraisal.controller');

// List and View routes
router.get('/', authenticate, appraisalController.getAppraisals);
router.get('/completed', authenticate, appraisalController.getCompleted);
router.get('/:id/list', authenticate, appraisalController.getDetails);
router.get('/:id/list-edit', authenticate, appraisalController.getDetailsForEdit);

// Process and Update routes
router.post('/:id/set-value', authenticate, appraisalController.setValue);
router.post('/:id/merge-descriptions', authenticate, appraisalController.mergeDescriptions);
router.post('/:id/update-title', authenticate, appraisalController.updateTitle);
router.post('/:id/insert-template', authenticate, appraisalController.insertTemplate);
router.post('/:id/generate-pdf', authenticate, appraisalController.generatePdf);
router.post('/:id/send-email', authenticate, appraisalController.sendEmail);
router.post('/:id/complete', authenticate, appraisalController.complete);
router.post('/:id/complete-process', authenticate, appraisalController.completeProcess);

module.exports = router;