const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { authorizedUsers } = require('../constants/authorizedUsers');

function authenticate(req, res, next) {
  try {
    // Get token from cookies or Authorization header
    let token = req.cookies?.jwtToken || req.headers.authorization?.split(' ')[1];
    const emergencyToken = req.cookies?.emergency_token;
    const sharedSecret = req.headers['x-shared-secret'];

    // Allow shared secret for backend-to-backend
    if (sharedSecret === config.SHARED_SECRET) {
      req.user = { role: 'worker' };
      return next();
    }

    // Check for emergency token (direct login)
    if (emergencyToken) {
      try {
        const decoded = Buffer.from(emergencyToken, 'base64').toString('utf-8');
        const [email, timestamp] = decoded.split(':');
        
        // Verify it's a valid emergency token
        if (email && timestamp && authorizedUsers.includes(email)) {
          const tokenAge = Date.now() - parseInt(timestamp, 10);
          // Ensure token is not older than 24 hours
          if (tokenAge < 24 * 60 * 60 * 1000) {
            req.user = { email, role: 'admin' };
            return next();
          }
        }
      } catch (e) {
        console.error('Invalid emergency token:', e);
      }
    }

    // Require either token or shared secret
    if (!token && !sharedSecret && !emergencyToken) {
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