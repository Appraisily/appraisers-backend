const express = require('express');
const router = express.Router();
const updatePendingController = require('../controllers/appraisal/updatePending.controller');

// Route matches API_ROUTES.UPDATE_PENDING
router.post('/', updatePendingController.updatePendingAppraisal);

module.exports = router;