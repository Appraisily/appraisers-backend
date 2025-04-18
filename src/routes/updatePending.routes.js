const express = require('express');
const router = express.Router();
const { validateSharedSecret } = require('../middleware/validateSharedSecret');
const { updatePendingAppraisal } = require('../controllers/updatePendingAppraisal.controller');

router.post('/', validateSharedSecret, updatePendingAppraisal);

module.exports = router;