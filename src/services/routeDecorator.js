/**
 * Route decorator utility to easily add documentation to Express routes
 */
const { registerRouteDocumentation } = require('./routeDocumentation');

/**
 * Decorator for Express route handlers to add documentation
 * @param {Object} documentation - Documentation object for the route
 * @param {Function} handler - Original route handler function
 * @returns {Function} - Decorated handler function
 */
function withDocumentation(documentation, handler) {
  // Store the documentation
  const methodName = extractMethodName(handler);
  handler.documentation = documentation;
  
  // Return a wrapped handler function
  return function documentedRouteHandler(req, res, next) {
    // Store documentation on the request object for reference
    req.routeDocumentation = documentation;
    
    // Call the original handler
    return handler(req, res, next);
  };
}

/**
 * Extract method name from a function
 * @param {Function} fn - Function to extract name from
 * @returns {string} - Method name or 'anonymous'
 */
function extractMethodName(fn) {
  return fn.name || 'anonymous';
}

/**
 * Register route with documentation
 * @param {express.Router} router - Express router instance
 * @param {string} method - HTTP method (get, post, put, delete)
 * @param {string} path - Route path
 * @param {Object} documentation - Documentation object
 * @param {Function|Array} handlers - Route handler(s)
 */
function registerRoute(router, method, path, documentation, ...handlers) {
  // Register the documentation
  registerRouteDocumentation(method, path, documentation);
  
  // Register the route with the original handler
  router[method](path, ...handlers);
}

/**
 * Decorate Express router with documentation methods
 * @param {express.Router} router - Express router instance
 * @returns {express.Router} - Decorated router
 */
function documentedRouter(router) {
  // Add documented route methods
  const documentedRouter = router;
  
  ['get', 'post', 'put', 'delete', 'patch'].forEach(method => {
    const originalMethod = router[method];
    
    documentedRouter[`${method}WithDocs`] = function(path, documentation, ...handlers) {
      registerRoute(router, method, path, documentation, ...handlers);
    };
  });
  
  return documentedRouter;
}

module.exports = {
  withDocumentation,
  documentedRouter,
  registerRoute
}; 