const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');

router.post('/authenticate', AuthController.authenticateUser);
router.post('/logout', AuthController.logoutUser);

module.exports = router;