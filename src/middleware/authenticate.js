const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { authorizedUsers } = require('../constants/authorizedUsers');

function authenticate(req, res, next) {
  try {
    // Get token from cookie or Authorization header
    let token = req.cookies?.jwtToken || req.headers.authorization?.split(' ')[1];
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
      req.user = decoded;
      return next();
    }

    // If we get here, no valid auth method was found
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
}

module.exports = authenticate;