const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { authorizedUsers } = require('../constants/authorizedUsers');

function authenticate(req, res, next) {
  console.log('🔒 Starting authentication check');

  // Get token from cookie, Authorization header, or check for worker secret
  const token = req.cookies.jwtToken || req.headers.authorization?.split(' ')[1];
  const workerSecret = req.headers['x-shared-secret'];
  
  // Allow worker secret
  if (workerSecret === config.SHARED_SECRET) {
    // Generate a worker JWT token valid for 1 hour
    const workerToken = jwt.sign(
      { role: 'worker' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );
    req.user = { role: 'worker', token: workerToken };
    return next();
  }

  if (!token) {
    console.log('❌ No token found');
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized. Token not provided.' 
    });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    console.log('✓ Token verified successfully');

    // Skip authorization check for worker requests
    if (decoded.role === 'worker') {
      req.user = decoded;
      return next();
    }

    // Check if user is authorized
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
    console.error('❌ JWT verification error:', error);
    
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