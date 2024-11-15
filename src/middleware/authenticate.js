const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { authorizedUsers } = require('../constants/authorizedUsers');

function authenticate(req, res, next) {
  console.log('🔒 [authenticate] Checking authentication');
  console.log('📨 [authenticate] Cookies:', req.cookies);
  
  const token = req.cookies.jwtToken;

  if (!token) {
    console.log('❌ [authenticate] No token found');
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized. Token not provided.' 
    });
  }

  try {
    const secret = config.JWT_SECRET || 'dev-jwt-secret';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;

    // Skip authorization check for refresh token requests
    if (req.path === '/auth/refresh') {
      return next();
    }

    if (!authorizedUsers.includes(decoded.email)) {
      console.log('❌ [authenticate] Unauthorized email:', decoded.email);
      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden. You do not have access to this resource.' 
      });
    }

    console.log('✅ [authenticate] Authentication successful');
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    console.error('❌ [authenticate] Error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token.' 
    });
  }
}