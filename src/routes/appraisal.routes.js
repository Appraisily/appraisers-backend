const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const appraisalController = require('../controllers/appraisal/appraisal.controller');

// List and View routes
router.get('/', authenticate, appraisalController.getAppraisals);
router.get('/completed', authenticate, appraisalController.getCompleted);
router.get('/:id/list', authenticate, appraisalController.getDetails);
router.get('/:id/list-edit', authenticate, appraisalController.getDetailsForEdit);

// Process route - only publishes to PubSub
router.post('/:id/complete-process', authenticate, appraisalController.completeProcess);

module.exports = router;