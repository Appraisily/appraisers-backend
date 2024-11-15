const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { authorizedUsers } = require('../constants/authorizedUsers');

function authenticate(req, res, next) {
  console.log('🔒 Starting authentication check');
  
  // Get token from cookie or Authorization header
  const cookieToken = req.cookies.jwtToken;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  const token = cookieToken || bearerToken;
  
  if (!token) {
    console.log('❌ No token found in cookies or Authorization header');
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Token not provided.'
    });
  }

  try {
    // Ensure we have a JWT secret
    if (!config.JWT_SECRET) {
      console.error('❌ JWT_SECRET not configured');
      throw new Error('JWT configuration error');
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    console.log('✓ Token verified successfully');

    // Check if request comes from task queue worker
    const isWorker = decoded.role === 'worker';

    // Skip authorization check for refresh token requests and worker requests
    if (req.path === '/auth/refresh' || isWorker) {
      req.user = decoded;
      return next();
    }

    if (!authorizedUsers.includes(decoded.email)) {
      console.log('❌ Unauthorized email:', decoded.email);
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have access to this resource.'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ JWT verification error:', error.message);
    
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

module.exports = { authenticate };