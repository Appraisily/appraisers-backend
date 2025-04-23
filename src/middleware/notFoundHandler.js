/**
 * Middleware to handle 404 errors and provide documentation on available endpoints
 */
const { getFormattedDocumentation } = require('../services/routeDocumentation');

function notFoundHandler(req, res, next) {
  // Get available endpoints based on req.app._router
  const availableEndpoints = [];
  
  if (req.app && req.app._router && req.app._router.stack) {
    const basePath = '/api'; // Adjust if your API has a different base path
    
    // Extract routes from the router stack
    findRoutes(req.app._router.stack, basePath).forEach(route => {
      availableEndpoints.push(`${route.method.toUpperCase()} ${route.path}`);
    });
  }
  
  // Try to get documentation for the closest matching endpoint
  const bestMatch = findClosestEndpoint(req.path, req.method);
  const documentation = bestMatch ? getFormattedDocumentation(bestMatch.method, bestMatch.path) : null;
  
  // Send response
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.path}`,
    documentation: documentation,
    availableEndpoints: availableEndpoints.sort()
  });
}

/**
 * Find all routes in the Express router stack
 * @param {Array} stack - Express router stack
 * @param {string} basePath - Base path prefix
 * @returns {Array} - Array of route objects with method and path
 */
function findRoutes(stack, basePath = '') {
  const routes = [];
  
  stack.forEach(layer => {
    if (layer.route) {
      // Routes registered directly on the router
      const path = basePath + layer.route.path;
      Object.keys(layer.route.methods).forEach(method => {
        if (layer.route.methods[method]) {
          routes.push({
            method,
            path
          });
        }
      });
    } else if (layer.name === 'router' && layer.handle.stack) {
      // Nested routers
      const path = layer.regexp.source.replace('^\\//', '/').replace('\\/?(?=\\/|$)', '');
      const nestedBase = basePath + (path === '/' ? '' : path);
      
      // Recursively get routes from nested router
      const nestedRoutes = findRoutes(layer.handle.stack, nestedBase);
      routes.push(...nestedRoutes);
    }
  });
  
  return routes;
}

/**
 * Find the closest matching endpoint to the requested path
 * @param {string} requestPath - Requested path
 * @param {string} requestMethod - HTTP method
 * @returns {Object|null} - Closest matching route or null
 */
function findClosestEndpoint(requestPath, requestMethod) {
  // This is a simple implementation that could be improved
  // For now, we'll just check if the requested path is a substring of any known route
  
  // Get all documented routes
  const documentedRoutes = [];
  // We'll implement this better when we register routes
  
  if (documentedRoutes.length === 0) {
    return null;
  }
  
  // Find the closest match based on string similarity
  let bestMatch = null;
  let bestScore = 0;
  
  documentedRoutes.forEach(route => {
    if (route.method.toUpperCase() !== requestMethod.toUpperCase()) {
      return;
    }
    
    const score = calculatePathSimilarity(route.path, requestPath);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = route;
    }
  });
  
  return bestMatch;
}

/**
 * Calculate similarity between two paths
 * @param {string} path1 - First path
 * @param {string} path2 - Second path
 * @returns {number} - Similarity score (0-1)
 */
function calculatePathSimilarity(path1, path2) {
  // Split paths into segments
  const segments1 = path1.split('/').filter(Boolean);
  const segments2 = path2.split('/').filter(Boolean);
  
  // If segment counts differ too much, they're not similar
  const lengthDiff = Math.abs(segments1.length - segments2.length);
  if (lengthDiff > 2) {
    return 0;
  }
  
  // Count matching segments
  const minLength = Math.min(segments1.length, segments2.length);
  let matches = 0;
  
  for (let i = 0; i < minLength; i++) {
    if (segments1[i] === segments2[i] || segments1[i].startsWith(':')) {
      matches++;
    }
  }
  
  return matches / Math.max(segments1.length, segments2.length);
}

module.exports = notFoundHandler;