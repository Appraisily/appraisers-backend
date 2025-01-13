const express = require('express');
const router = express.Router();
const appraisalController = require('../controllers/appraisal.controller');
const authenticate = require('../middleware/authenticate');
const { validateSetValue } = require('../middleware/validateSetValue');

// List and View routes
router.get('/', authenticate, appraisalController.getAppraisals);
router.get('/completed', authenticate, appraisalController.getCompletedAppraisals);
router.get('/:id/list', authenticate, appraisalController.getDetails);
router.get('/:id/list-edit', authenticate, appraisalController.getDetailsForEdit);

// Process routes
router.post('/:id/set-value', authenticate, validateSetValue, appraisalController.setValue);
router.post('/:id/complete-process', authenticate, appraisalController.completeProcess);
router.post('/:id/update-acf-field', authenticate, appraisalController.updateAcfField);
router.post('/get-session-id', authenticate, appraisalController.getSessionId);
router.post('/:id/save-links', authenticate, appraisalController.saveLinks);
router.post('/:id/update-links', authenticate, appraisalController.updateLinks);
router.post('/:id/complete', authenticate, appraisalController.complete);

module.exports = router;