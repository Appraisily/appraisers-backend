const { config } = require('../config');
const jwt = require('jsonwebtoken');

function validateWorker(req, res, next) {
  const authHeader = req.headers.authorization;
  const workerSecret = req.headers['x-worker-secret'];
  
  // First try worker secret
  if (workerSecret && workerSecret === config.SHARED_SECRET) {
    req.user = { role: 'worker' };
    return next();
  }

  // Then try JWT
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized worker request'
    });
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.JWT_SECRET);

    if (decoded.role !== 'worker') {
      throw new Error('Not a worker token');
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('Worker validation error:', error);
    res.status(403).json({
      success: false,
      message: 'Invalid worker credentials'
    });
  }
}

module.exports = { validateWorker };