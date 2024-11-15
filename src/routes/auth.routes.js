const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth/auth.controller');

// Remove /auth prefix as it's added by the parent router
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);
router.post('/google', authController.googleLogin);

module.exports = router;