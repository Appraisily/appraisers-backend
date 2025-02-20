const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { validateSetValue } = require('../middleware/validateSetValue');
const AppraisalController = require('../controllers/appraisal');

// List and View routes
router.get('/', authenticate, AppraisalController.getAppraisals);
router.get('/completed', authenticate, AppraisalController.getCompletedAppraisals);
router.get('/:id/list', authenticate, AppraisalController.getDetails);
router.get('/:id/list-edit', authenticate, AppraisalController.getDetailsForEdit);

// Value proposal route
router.post('/propose-value', authenticate, AppraisalController.proposeValue);

// Process routes
router.post('/:id/set-value', authenticate, validateSetValue, AppraisalController.setValue);
router.post('/:id/complete-process', authenticate, AppraisalController.completeProcess);

module.exports = router;