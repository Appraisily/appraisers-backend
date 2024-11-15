const { config } = require('../config');

function validateWorker(req, res, next) {
  const workerSecret = req.headers['x-worker-secret'];
  
  if (!workerSecret || workerSecret !== config.WORKER_SECRET) {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized worker request'
    });
  }

  next();
}

module.exports = { validateWorker };