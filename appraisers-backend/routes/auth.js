// routes/auth.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/authenticate', authController.authenticateUser);
router.post('/logout', authController.logoutUser);

module.exports = router;
