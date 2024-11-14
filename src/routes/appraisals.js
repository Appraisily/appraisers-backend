const express = require('express');
const router = express.Router();
const AppraisalController = require('../controllers/appraisalController');
const authenticate = require('../middleware/authenticate');

// Get all appraisals
router.get('/', authenticate, AppraisalController.getAppraisals);

// Complete appraisal process
router.post('/:id/complete-process', authenticate, AppraisalController.completeProcess);

module.exports = router;