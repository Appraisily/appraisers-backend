const { config } = require('../config');

class RouteError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'RouteError';
    this.statusCode = statusCode;
  }
}

function errorHandler(err, req, res, next) {
  // Log error details
  console.error('Error:', {
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  // Handle specific error types
  if (err instanceof RouteError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = { 
  errorHandler,
  RouteError
};