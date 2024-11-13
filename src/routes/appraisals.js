const express = require('express');
const router = express.Router();
const AppraisalController = require('../controllers/appraisalController');
const authenticate = require('../middleware/authenticate');

// Get all appraisals
router.get('/', authenticate, AppraisalController.getAppraisals);

// Get completed appraisals
router.get('/completed', authenticate, AppraisalController.getCompletedAppraisals);

// Get specific appraisal details
router.get('/:id/list', authenticate, AppraisalController.getAppraisalDetails);

// Get appraisal details for editing
router.get('/:id/list-edit', authenticate, AppraisalController.getAppraisalDetailsForEdit);

// Update ACF field
router.put('/:id/update-acf-field', authenticate, AppraisalController.updateAcfField);

// Set appraisal value
router.post('/:id/set-value', authenticate, AppraisalController.setAppraisalValue);

// Start appraisal process
router.post('/:id/complete-process', authenticate, AppraisalController.completeProcess);

// Get session ID
router.post('/get-session-id', authenticate, AppraisalController.getSessionId);

// Save links
router.post('/:id/save-links', authenticate, AppraisalController.saveLinks);

// Insert template
router.post('/:id/insert-template', authenticate, AppraisalController.insertTemplate);

// Update post title
router.post('/:id/update-title', authenticate, AppraisalController.updatePostTitle);

// Send email to customer
router.post('/:id/send-email', authenticate, AppraisalController.sendEmailToCustomer);

// Update links
router.post('/:id/update-links', authenticate, AppraisalController.updateLinks);

// Complete appraisal
router.post('/:id/complete', authenticate, AppraisalController.completeAppraisal);

module.exports = router;