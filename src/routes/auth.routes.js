const express = require('express');
const router = express.Router();
const { login, refresh, logout } = require('../controllers/auth/auth.controller');

// Auth routes
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);

module.exports = router;