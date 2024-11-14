const express = require('express');
const router = express.Router();
const UpdatePendingAppraisalController = require('../controllers/updatePendingAppraisal.controller');

router.post('/', UpdatePendingAppraisalController.updatePendingAppraisal);

module.exports = router;