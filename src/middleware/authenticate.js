const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { authorizedUsers } = require('../constants/authorizedUsers');

function authenticate(req, res, next) {
  // Check shared secret first (for worker/backend access)
  const sharedSecret = req.headers['x-shared-secret'];
  if (sharedSecret === config.SHARED_SECRET) {
    req.user = { role: 'worker' };
    return next();
  }

  // Get JWT token from cookie or Authorization header
  const token = req.cookies.jwtToken || req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);

    // Allow worker tokens
    if (decoded.role === 'worker') {
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
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    res.status(401).json({
      success: false,
      message: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
}

module.exports = authenticate;