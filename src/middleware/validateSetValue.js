const { RouteError } = require('./errorHandler');
const { getFormattedDocumentation } = require('../services/routeDocumentation');

/**
 * Middleware to validate appraisal value setting requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateSetValue(req, res, next) {
  const { appraisalValue, description } = req.body;
  const errors = [];

  if (appraisalValue === undefined) {
    errors.push('appraisalValue is required');
  } else if (typeof appraisalValue !== 'number' || isNaN(appraisalValue)) {
    errors.push('appraisalValue must be a valid number');
  }

  if (description === undefined) {
    errors.push('description is required');
  } else if (typeof description !== 'string' || description.trim() === '') {
    errors.push('description must be a non-empty string');
  }

  if (errors.length > 0) {
    const path = req.route ? req.route.path : req.path;
    const method = req.method;
    const documentation = getFormattedDocumentation(method, path);
    
    const errorMessage = `Validation failed: ${errors.join(', ')}`;
    
    // Use RouteError for consistent handling
    return next(new RouteError(errorMessage, 400, true));
  }

  next();
}

module.exports = { validateSetValue };