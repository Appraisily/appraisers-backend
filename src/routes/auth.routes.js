const express = require('express');
const router = express.Router();
const { authenticateUser, logoutUser } = require('../controllers/auth.controller');

// Authentication routes
router.post('/authenticate', authenticateUser);
router.post('/logout', logoutUser);

module.exports = router;