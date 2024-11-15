const express = require('express');
const router = express.Router();
const { updatePendingAppraisal } = require('../controllers/updatePendingAppraisal.controller');

router.post('/', updatePendingAppraisal);

module.exports = router;