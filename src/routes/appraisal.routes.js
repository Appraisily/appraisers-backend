const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const { validateSetValue } = require('../middleware/validateSetValue');
const AppraisalController = require('../controllers/appraisal.controller');

// Get all appraisals
router.get('/', authenticate, AppraisalController.getAppraisals);

// Get completed appraisals
router.get('/completed', authenticate, AppraisalController.getCompletedAppraisals);

// Get specific appraisal details
router.get('/:id/list', authenticate, AppraisalController.getAppraisalDetails);
router.get('/:id/list-edit', authenticate, AppraisalController.getAppraisalDetailsForEdit);

// Update appraisal
router.put('/:id/update-acf-field', authenticate, AppraisalController.updateAcfField);
router.post('/:id/set-value', authenticate, validateSetValue, AppraisalController.setAppraisalValue);
router.post('/:id/complete-process', authenticate, AppraisalController.completeProcess);

// Session and links management
router.post('/get-session-id', authenticate, AppraisalController.getSessionId);
router.post('/:id/save-links', authenticate, AppraisalController.saveLinks);
router.post('/:id/update-links', authenticate, AppraisalController.updateLinks);

// Template and content management
router.post('/:id/insert-template', authenticate, AppraisalController.insertTemplate);
router.post('/:id/update-title', authenticate, AppraisalController.updatePostTitle);

// Email and completion
router.post('/:id/send-email', authenticate, AppraisalController.sendEmailToCustomer);
router.post('/:id/complete', authenticate, AppraisalController.completeAppraisal);

module.exports = router;