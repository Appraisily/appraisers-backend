const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth/auth.controller');

// Login
router.post('/login', (req, res) => authController.login(req, res));

// Refresh token
router.post('/refresh', (req, res) => authController.refresh(req, res));

// Logout
router.post('/logout', (req, res) => authController.logout(req, res));

module.exports = router;