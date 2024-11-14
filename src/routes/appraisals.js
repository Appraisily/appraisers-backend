const express = require('express');
const router = express.Router();
const AppraisalController = require('../controllers/appraisalController');
const authenticate = require('../middleware/authenticate');

router.post('/:id/complete-process', authenticate, AppraisalController.completeProcess);

module.exports = router;