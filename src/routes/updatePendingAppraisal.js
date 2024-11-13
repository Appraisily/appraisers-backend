const express = require('express');
const router = express.Router();
const UpdatePendingAppraisalController = require('../controllers/updatePendingAppraisalController');

router.post('/', UpdatePendingAppraisalController.updatePendingAppraisal);

module.exports = router;