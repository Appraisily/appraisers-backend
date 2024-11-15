const express = require('express');
const router = express.Router();
const updatePendingController = require('../controllers/appraisal/updatePending.controller');

router.post('/', (req, res) => updatePendingController.updatePendingAppraisal(req, res));

module.exports = router;