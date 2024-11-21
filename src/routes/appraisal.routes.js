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
router.post('/:id/generate-pdf', authenticate, appraisalController.generatePdf); // Updated endpoint name
router.post('/:id/complete-process', authenticate, appraisalController.completeProcess);
router.post('/:id/send-email', authenticate, appraisalController.sendEmail);

module.exports = router;