const express = require('express');
const router = express.Router();
const { 
  authenticateUser,
  refreshToken,
  logoutUser 
} = require('../controllers/auth.controller');

// Basic authentication
router.post('/login', authenticateUser);

// Google authentication (if needed later)
// router.post('/google', authenticateWithGoogle);

// Token refresh
router.post('/refresh', refreshToken);

// Logout
router.post('/logout', logoutUser);

module.exports = router;