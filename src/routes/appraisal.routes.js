const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const appraisalController = require('../controllers/appraisal/appraisal.controller');

// List and View routes
router.get('/', authenticate, appraisalController.getAppraisals);
router.get('/completed', authenticate, appraisalController.getCompletedAppraisals);
router.get('/:id/list', authenticate, appraisalController.getDetails);
router.get('/:id/list-edit', authenticate, appraisalController.getDetailsForEdit);

// Process routes
router.post('/:id/set-value', authenticate, appraisalController.setValue);
router.post('/:id/complete-process', authenticate, appraisalController.completeProcess);
router.post('/process-worker', authenticate, appraisalController.processWorker);

module.exports = router;