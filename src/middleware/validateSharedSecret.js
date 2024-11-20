const { config } = require('../config');

function validateSharedSecret(req, res, next) {
  const incomingSecret = req.headers['x-shared-secret'];
  
  if (!incomingSecret || incomingSecret !== config.SHARED_SECRET) {
    console.warn('Authentication failed: Invalid shared secret');
    return res.status(403).json({ 
      success: false, 
      message: 'Forbidden: Invalid shared secret' 
    });
  }

  next();
}

module.exports = { validateSharedSecret };