
// routes/appraisals.js

const express = require('express');
const router = express.Router();
const appraisalsController = require('../controllers/appraisalsController');
const authenticate = require('../middleware/authenticate');
const validateSetValueData = require('../utils/validateSetValueData');

router.get('/appraisals', authenticate, appraisalsController.getAppraisals);
router.get('/appraisals/:id/list', authenticate, appraisalsController.getAppraisalDetails);
router.get('/appraisals/:id/list-edit', authenticate, appraisalsController.getAppraisalDetailsForEdit);
router.put('/appraisals/:id/update-acf-field', authenticate, appraisalsController.updateAcfField);
router.post('/appraisals/:id/set-value', authenticate, validateSetValueData, appraisalsController.setAppraisalValue);
router.post('/appraisals/:id/complete-process', authenticate, appraisalsController.completeProcess);
router.post('/appraisals/get-session-id', authenticate, appraisalsController.getSessionId);
router.post('/appraisals/:id/save-links', authenticate, appraisalsController.saveLinks);
router.get('/appraisals/completed', authenticate, appraisalsController.getCompletedAppraisals);
router.post('/appraisals/:id/insert-template', authenticate, appraisalsController.insertTemplate);
router.post('/appraisals/:id/update-title', authenticate, appraisalsController.updatePostTitle);
router.post('/appraisals/:id/send-email', authenticate, appraisalsController.sendEmailToCustomer);
router.post('/appraisals/:id/update-links', authenticate, appraisalsController.updateLinks);
router.post('/appraisals/:id/complete', authenticate, appraisalsController.completeAppraisal);

module.exports = router;
