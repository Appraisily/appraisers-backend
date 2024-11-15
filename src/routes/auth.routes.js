const express = require('express');
const router = express.Router();
const { 
  authenticateUser,
  refreshToken,
  logoutUser 
} = require('../controllers/auth.controller');

// Standard login
router.post('/login', authenticateUser);

// Token refresh
router.post('/refresh', refreshToken);

// Logout
router.post('/logout', logoutUser);

module.exports = router;