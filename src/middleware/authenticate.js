const jwt = require('jsonwebtoken');
const { config } = require('../config');
const authorizedUsers = require('../constants/authorizedUsers');

function authenticate(req, res, next) {
  console.log('🔒 [authenticate] Starting authentication check');
  console.log('📨 [authenticate] Headers:', {
    cookie: req.headers.cookie,
    authorization: req.headers.authorization
  });

  const token = req.cookies.jwtToken;
  
  if (!token) {
    console.log('❌ [authenticate] No JWT token found in cookies');
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized. Token not provided.' 
    });
  }

  try {
    console.log('🔍 [authenticate] Verifying JWT token');
    const decoded = jwt.verify(token, config.JWT_SECRET);
    console.log('✅ [authenticate] JWT verified successfully:', { 
      email: decoded.email,
      exp: new Date(decoded.exp * 1000)
    });

    req.user = decoded;

    if (!authorizedUsers.includes(decoded.email)) {
      console.log(`❌ [authenticate] User ${decoded.email} not in authorized users list`);
      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden. You do not have access to this resource.' 
      });
    }

    // Check if token is about to expire (less than 5 minutes remaining)
    const expirationTime = decoded.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const timeRemaining = expirationTime - currentTime;
    const fiveMinutes = 5 * 60 * 1000;

    if (timeRemaining < fiveMinutes) {
      console.log('⚠️ [authenticate] Token about to expire, setting refresh header');
      res.set('X-Token-Expiring', 'true');
    }

    console.log('✅ [authenticate] Authentication successful');
    next();
  } catch (error) {
    console.error('❌ [authenticate] JWT verification error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired. Please login again.' 
      });
    }
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token.' 
    });
  }
}

module.exports = authenticate;