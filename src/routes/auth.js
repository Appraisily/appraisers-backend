const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

router.post('/login', AuthController.authenticateUser);
router.post('/logout', AuthController.logoutUser);
router.post('/refresh', AuthController.refreshToken);

module.exports = router;