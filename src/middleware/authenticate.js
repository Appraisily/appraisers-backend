const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { authorizedUsers } = require('../constants/authorizedUsers');

function authenticate(req, res, next) {
  // First check for shared secret (backend-to-backend)
  const sharedSecret = req.headers['x-shared-secret'];
  if (sharedSecret === config.SHARED_SECRET) {
    req.user = { role: 'worker' };
    return next();
  }

  // Then check for JWT token
  const token = req.cookies.jwtToken || req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);

    // Allow worker tokens and shared secret auth
    if (decoded.role === 'worker' || req.headers['x-shared-secret'] === config.SHARED_SECRET) {
      req.user = decoded;
      return next();
    }

    // Check user authorization
    if (!authorizedUsers.includes(decoded.email)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
}

module.exports = authenticate;