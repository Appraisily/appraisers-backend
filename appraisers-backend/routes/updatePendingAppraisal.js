
// routes/updatePendingAppraisal.js

const express = require('express');
const router = express.Router();
const updatePendingAppraisalController = require('../controllers/updatePendingAppraisalController');

router.post('/update-pending-appraisal', updatePendingAppraisalController.updatePendingAppraisal);

module.exports = router;
