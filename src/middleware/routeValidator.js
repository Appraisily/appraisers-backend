const { API_ROUTES } = require('../constants/routes');

class RouteValidator {
  static validateRoutes(router) {
    const routes = this.getRoutes(router);
    
    routes.forEach(route => {
      const normalizedPath = this.normalizePath(route.path);
      if (!this.isValidRoute(normalizedPath)) {
        throw new Error(`Route ${route.path} is not defined in API_ROUTES`);
      }
    });

    return router;
  }

  static getRoutes(router, prefix = '') {
    const routes = [];

    router.stack.forEach(layer => {
      if (layer.route) {
        routes.push({
          path: prefix + layer.route.path,
          methods: Object.keys(layer.route.methods)
        });
      } else if (layer.name === 'router') {
        const newPrefix = prefix + (layer.regexp.source === '/' ? '' : this.cleanPath(layer.regexp.source));
        routes.push(...this.getRoutes(layer.handle, newPrefix));
      }
    });

    return routes;
  }

  static normalizePath(path) {
    return path
      .replace(/^\/+|\/+$/g, '') // Remove leading/trailing slashes
      .replace(/\/+/g, '/') // Remove duplicate slashes
      .replace(/:\w+/g, ':id'); // Normalize params to :id
  }

  static cleanPath(path) {
    return path
      .replace(/^\^\\\//, '') // Remove leading ^\/
      .replace(/\\\/\?\(\?\=.*$/, '') // Remove trailing regex
      .replace(/\\\//g, '/') // Replace \/ with /
      .replace(/^\^|\$$/g, '') // Remove ^ and $ anchors
      .replace(/\(\?:\([^\)]+\)\)\?/g, '') // Remove optional groups
      .replace(/\([^\)]+\)/g, '') // Remove remaining groups
      .replace(/\\(.)/g, '$1'); // Unescape characters
  }

  static isValidRoute(path) {
    // Get all defined routes
    const routes = [];
    Object.values(API_ROUTES).forEach(group => {
      if (typeof group === 'string') {
        routes.push(this.normalizePath(group));
      } else {
        Object.values(group).forEach(route => {
          routes.push(this.normalizePath(route));
        });
      }
    });

    // Check if normalized path matches any defined route
    return routes.includes(path);
  }
}

module.exports = RouteValidator;