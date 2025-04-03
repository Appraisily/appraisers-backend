/**
 * Route documentation utility to provide instructions for API endpoints
 */

// Store documentation for each route
const routeDocumentation = new Map();

/**
 * Register documentation for a route
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {string} path - Route path
 * @param {Object} documentation - Documentation object
 * @param {string} documentation.description - Description of what the endpoint does
 * @param {Object} [documentation.parameters] - Parameters the endpoint accepts
 * @param {Object} [documentation.requestBody] - Request body structure
 * @param {Object} [documentation.response] - Example successful response
 */
function registerRouteDocumentation(method, path, documentation) {
  const routeKey = `${method.toUpperCase()}:${path}`;
  routeDocumentation.set(routeKey, documentation);
}

/**
 * Get documentation for a route
 * @param {string} method - HTTP method
 * @param {string} path - Route path
 * @returns {Object|null} - Documentation for the route or null if not found
 */
function getRouteDocumentation(method, path) {
  // Try exact match first
  const routeKey = `${method.toUpperCase()}:${path}`;
  if (routeDocumentation.has(routeKey)) {
    return routeDocumentation.get(routeKey);
  }

  // Try matching parameterized routes
  // Convert path parameters in the requested path to the :param format
  // For example, /appraisals/123/list should match /appraisals/:id/list
  for (const [key, doc] of routeDocumentation.entries()) {
    const [docMethod, docPath] = key.split(':');
    if (docMethod !== method.toUpperCase()) continue;

    // Split the paths into segments
    const docPathSegments = docPath.split('/');
    const pathSegments = path.split('/');

    // Paths with different segment counts won't match
    if (docPathSegments.length !== pathSegments.length) continue;

    // Check if the segments match, treating :param segments as wildcards
    const matches = docPathSegments.every((segment, i) => {
      return segment.startsWith(':') || segment === pathSegments[i];
    });

    if (matches) {
      return doc;
    }
  }

  return null;
}

/**
 * Get formatted documentation for a route
 * @param {string} method - HTTP method
 * @param {string} path - Route path
 * @returns {string} - Formatted documentation or error message
 */
function getFormattedDocumentation(method, path) {
  const doc = getRouteDocumentation(method, path);
  if (!doc) {
    return `No documentation found for ${method.toUpperCase()} ${path}`;
  }

  let formatted = `
## ${method.toUpperCase()} ${path}

${doc.description || 'No description provided'}

`;

  if (doc.parameters && Object.keys(doc.parameters).length > 0) {
    formatted += '### Parameters\n\n';
    for (const [name, details] of Object.entries(doc.parameters)) {
      formatted += `- \`${name}\`: ${details.description || ''}`;
      if (details.required) formatted += ' (Required)';
      formatted += '\n';
    }
    formatted += '\n';
  }

  if (doc.requestBody) {
    formatted += '### Request Body\n\n';
    formatted += '```json\n';
    formatted += JSON.stringify(doc.requestBody, null, 2);
    formatted += '\n```\n\n';
  }

  if (doc.response) {
    formatted += '### Example Response\n\n';
    formatted += '```json\n';
    formatted += JSON.stringify(doc.response, null, 2);
    formatted += '\n```\n\n';
  }

  return formatted;
}

module.exports = {
  registerRouteDocumentation,
  getRouteDocumentation,
  getFormattedDocumentation
};