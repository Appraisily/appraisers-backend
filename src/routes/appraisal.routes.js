const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { validateSetValue } = require('../middleware/validateSetValue');
const appraisalController = require('../controllers/appraisal/appraisal.controller');

// List and View routes
router.get('/', authenticate, appraisalController.getAppraisals);
router.get('/completed', authenticate, appraisalController.getCompletedAppraisals);
router.get('/:id/list', authenticate, appraisalController.getDetails);
router.get('/:id/list-edit', authenticate, appraisalController.getDetailsForEdit);

// Process routes
router.post('/:id/set-value', authenticate, validateSetValue, appraisalController.setValue);
router.post('/:id/complete-process', authenticate, appraisalController.completeProcess);

module.exports = router;