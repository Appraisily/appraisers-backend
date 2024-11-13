const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

// Cambiar la ruta de authenticate a login
router.post('/login', AuthController.authenticateUser);
router.post('/logout', AuthController.logoutUser);

module.exports = router;