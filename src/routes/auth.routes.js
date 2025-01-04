const express = require('express');
const router = express.Router();
const { login, refresh, logout } = require('../controllers/auth/auth.controller');
const { googleAuth } = require('../controllers/auth/google.controller');

// Auth routes
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/google', googleAuth);

module.exports = router;