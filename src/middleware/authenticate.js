const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { authorizedUsers } = require('../constants/authorizedUsers');

function authenticate(req, res, next) {
  const token = req.cookies.jwtToken;

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized. Token not provided.' 
    });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;

    // Skip authorization check for refresh token requests
    if (req.path === '/auth/refresh') {
      return next();
    }

    if (!authorizedUsers.includes(decoded.email)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden. You do not have access to this resource.' 
      });
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    console.error('Error verifying JWT:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token.' 
    });
  }
}

module.exports = { authenticate };