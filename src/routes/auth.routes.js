const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth/auth.controller');
const { API_ROUTES } = require('../constants/routes');

// Remove /api prefix as it's added in index.js
router.post('/auth/login', authController.login);
router.post('/auth/logout', authController.logout);
router.post('/auth/refresh', authController.refresh);
router.post('/auth/google', authController.googleLogin);

module.exports = router;