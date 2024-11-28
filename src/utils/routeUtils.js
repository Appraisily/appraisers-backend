/**
 * Normalizes a route path by:
 * - Removing leading/trailing slashes
 * - Replacing multiple slashes with single slash
 * - Normalizing route parameters
 */
function normalizeRoute(path) {
  if (typeof path !== 'string') {
    return '';
  }
  return path
    .replace(/^\/+|\/+$/g, '')  // Remove leading/trailing slashes
    .replace(/\/+/g, '/')       // Replace multiple slashes
    .replace(/:\w+/g, ':id');   // Normalize parameters
}

/**
 * Cleans a route regexp by removing regex syntax
 */
function cleanPath(regexp) {
  return regexp.toString()
    .replace(/^\^\\\//, '')                // Remove leading ^\/
    .replace(/\\\/\?\(\?\=.*$/, '')        // Remove trailing regex
    .replace(/\\\//g, '/')                 // Replace \/ with /
    .replace(/^\^|\$$/g, '')              // Remove ^ and $ anchors
    .replace(/\(\?:\([^\)]+\)\)\?/g, '')   // Remove optional groups
    .replace(/\([^\)]+\)/g, '')           // Remove remaining groups
    .replace(/\\(.)/g, '$1');             // Unescape characters
}

module.exports = {
  normalizeRoute,
  cleanPath
};