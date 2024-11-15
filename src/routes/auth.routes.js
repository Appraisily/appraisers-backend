const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth/auth.controller');

// Basic authentication
router.post('/login', (req, res) => authController.login(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.post('/refresh', (req, res) => authController.refresh(req, res));

// Google authentication
router.post('/google', (req, res) => authController.googleLogin(req, res));

module.exports = router;