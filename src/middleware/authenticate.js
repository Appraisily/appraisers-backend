const jwt = require('jsonwebtoken');
const { config } = require('../config');
const authorizedUsers = require('../constants/authorizedUsers');

function authenticate(req, res, next) {
  console.log('🔒 [authenticate] Starting authentication check');

  // Get token from cookie or Authorization header
  const cookieToken = req.cookies.jwtToken;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  const token = cookieToken || bearerToken;

  console.log('🔍 [authenticate] Token sources:', {
    hasCookieToken: !!cookieToken,
    hasAuthHeader: !!authHeader,
    hasBearerToken: !!bearerToken
  });

  if (!token) {
    console.log('❌ [authenticate] No token found in cookies or Authorization header');
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

    // Skip authorized users check for worker requests
    const isWorkerRequest = req.headers['x-worker-request'] === 'true';
    if (!isWorkerRequest && !authorizedUsers.includes(decoded.email)) {
      console.log(`❌ [authenticate] User ${decoded.email} not in authorized users list`);
      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden. You do not have access to this resource.' 
      });
    }

    next();
  } catch (error) {
    console.error('❌ [authenticate] JWT verification error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired.' 
      });
    }
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token.' 
    });
  }
}

module.exports = authenticate;