const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

router.post('/login', AuthController.authenticateUser);
router.post('/logout', AuthController.logoutUser);

module.exports = router;