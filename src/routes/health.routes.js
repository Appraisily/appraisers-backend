const express = require('express');
const router = express.Router();
const HealthController = require('../controllers/health.controller');

router.get('/endpoints', HealthController.getEndpoints);
router.get('/status', HealthController.getStatus);

module.exports = router;