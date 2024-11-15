const express = require('express');
const router = express.Router();
const { 
  authenticateUser, 
  authenticateGoogle,
  refreshToken,
  logoutUser 
} = require('../controllers/auth.controller');

// Standard login
router.post('/login', authenticateUser);

// Google authentication
router.post('/google', authenticateGoogle);

// Token refresh
router.post('/refresh', refreshToken);

// Logout
router.post('/logout', logoutUser);

module.exports = router;