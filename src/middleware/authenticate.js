const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { authorizedUsers } = require('../constants/authorizedUsers');

function authenticate(req, res, next) {
  try {
    // Get token from cookie or Authorization header
    const token = req.cookies?.jwtToken || req.headers.authorization?.split(' ')[1];
    const sharedSecret = req.headers['x-shared-secret'];

    // Allow shared secret for backend-to-backend
    if (sharedSecret === config.SHARED_SECRET) {
      req.user = { role: 'worker' };
      return next();
    }

    // Require either token or shared secret
    if (!token && !sharedSecret) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify JWT token
    if (token) {
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
      return next();
    }

    // If we get here, no valid auth method was found
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication'
    });

  } catch (error) {
    console.error('Authentication error:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
}

module.exports = authenticate;