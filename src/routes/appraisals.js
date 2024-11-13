const express = require('express');
const router = express.Router();
const AppraisalController = require('../controllers/appraisalController');
const authenticate = require('../middleware/authenticate');

// Ensure all routes have proper middleware and controller methods
router.get('/', authenticate, AppraisalController.getAppraisals);
router.get('/completed', authenticate, AppraisalController.getCompletedAppraisals);
router.get('/:id/list', authenticate, AppraisalController.getAppraisalDetails);
router.get('/:id/list-edit', authenticate, AppraisalController.getAppraisalDetailsForEdit);
router.put('/:id/update-acf-field', authenticate, AppraisalController.updateAcfField);
router.post('/:id/set-value', authenticate, AppraisalController.setAppraisalValue);
router.post('/:id/complete-process', authenticate, AppraisalController.completeProcess);
router.post('/get-session-id', authenticate, AppraisalController.getSessionId);
router.post('/:id/save-links', authenticate, AppraisalController.saveLinks);
router.post('/:id/insert-template', authenticate, AppraisalController.insertTemplate);
router.post('/:id/update-title', authenticate, AppraisalController.updatePostTitle);
router.post('/:id/send-email', authenticate, AppraisalController.sendEmailToCustomer);
router.post('/:id/update-links', authenticate, AppraisalController.updateLinks);
router.post('/:id/complete', authenticate, AppraisalController.completeAppraisal);

module.exports = router;