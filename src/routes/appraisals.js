const express = require('express');
const router = express.Router();
const AppraisalController = require('../controllers/appraisal.controller');
const authenticate = require('../middleware/authenticate'); 
const { validateSetValue } = require('../middleware/validateSetValue'); 

// List and View routes
router.get('/', authenticate, AppraisalController.getAppraisals);
router.get('/completed', authenticate, AppraisalController.getCompletedAppraisals);
router.get('/:id/list', authenticate, AppraisalController.getDetails);
router.get('/:id/list-edit', authenticate, AppraisalController.getDetailsForEdit);

// Process routes
router.post('/:id/set-value', authenticate, validateSetValue, AppraisalController.setValue);
router.post('/:id/complete-process', authenticate, AppraisalController.completeProcess);
router.post('/:id/update-acf-field', authenticate, AppraisalController.updateAcfField);
router.post('/get-session-id', authenticate, AppraisalController.getSessionId);
router.post('/:id/save-links', authenticate, AppraisalController.saveLinks);
router.post('/:id/update-links', authenticate, AppraisalController.updateLinks);
router.post('/:id/complete', authenticate, AppraisalController.complete);

module.exports = router;