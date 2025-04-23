const { config } = require('../config');
const { getFormattedDocumentation } = require('../services/routeDocumentation');

class RouteError extends Error {
  constructor(message, statusCode = 400, includeDocumentation = true) {
    super(message);
    this.name = 'RouteError';
    this.statusCode = statusCode;
    this.includeDocumentation = includeDocumentation;
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
    const response = {
      success: false,
      message: err.message
    };

    // Include documentation for the endpoint if available and if this is a client error (4xx)
    if (err.includeDocumentation && err.statusCode >= 400 && err.statusCode < 500) {
      const documentation = getFormattedDocumentation(req.method, req.route ? req.route.path : req.path);
      if (documentation) {
        response.documentation = documentation;
      }
    }

    return res.status(err.statusCode).json(response);
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'ValidationError') {
    // For validation errors, include documentation
    const response = {
      success: false,
      message: err.message
    };

    const documentation = getFormattedDocumentation(req.method, req.route ? req.route.path : req.path);
    if (documentation) {
      response.documentation = documentation;
    }

    return res.status(400).json(response);
  }

  // For 400 Bad Request errors, include documentation
  if (err.statusCode === 400) {
    const response = {
      success: false,
      message: err.message
    };

    const documentation = getFormattedDocumentation(req.method, req.route ? req.route.path : req.path);
    if (documentation) {
      response.documentation = documentation;
    }

    return res.status(400).json(response);
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