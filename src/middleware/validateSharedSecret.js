const { config } = require('../config');

function validateSharedSecret(req, res, next) {
  const sharedSecret = req.headers['x-shared-secret'];
  
  if (!sharedSecret || sharedSecret !== config.SHARED_SECRET) {
    return res.status(403).json({
      success: false,
      message: 'Invalid shared secret'
    });
  }

  req.user = { role: 'worker' };
  next();
}

module.exports = { validateSharedSecret };