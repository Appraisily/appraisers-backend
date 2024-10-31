
// routes/auth.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');

router.post('/authenticate', authController.authenticate);
router.post('/logout', authController.logout);
router.get('/check-auth', authenticate, authController.checkAuth);

module.exports = router;
