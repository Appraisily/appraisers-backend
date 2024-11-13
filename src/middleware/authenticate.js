const jwt = require('jsonwebtoken');
const { config } = require('../config');
const authorizedUsers = require('../constants/authorizedUsers');

function authenticate(req, res, next) {
  console.log('🔒 [authenticate] Starting authentication check');
  console.log('📨 [authenticate] Headers:', req.headers);

  // Get token from cookie or Authorization header
  const cookieToken = req.cookies.jwtToken;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  const token = cookieToken || bearerToken;

  console.log('📨 [authenticate] Cookies:', req.cookies);

  if (!token) {
    console.log('❌ [authenticate] No JWT token found in cookies');
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized. Token not provided.' 
    });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;

    // Check if this is a worker request
    const isWorkerRequest = req.headers['x-worker-request'] === 'true';
    console.log('🔍 [authenticate] Request type:', { 
      isWorkerRequest,
      email: decoded.email,
      headers: {
        'x-worker-request': req.headers['x-worker-request']
      }
    });

    // Skip authorized users check for worker requests
    if (isWorkerRequest) {
      console.log('✅ [authenticate] Worker request authenticated');
      return next();
    }

    // For non-worker requests, check if user is authorized
    if (!authorizedUsers.includes(decoded.email)) {
      console.log('❌ [authenticate] Unauthorized access attempt:', decoded.email);
      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden. You do not have access to this resource.' 
      });
    }

    console.log('✅ [authenticate] User authenticated:', decoded.email);
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