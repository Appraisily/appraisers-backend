const { API_ROUTES } = require('../constants/routes');

class RouteValidator {
  static validateRoutes(router) {
    const routes = this.getRouterPaths(router);
    const validRoutes = this.getValidRoutes();

    routes.forEach(route => {
      const normalizedPath = this.normalizePath(route);
      if (!validRoutes.has(normalizedPath)) {
        throw new Error(`Invalid route: ${route}`);
      }
    });

    return router;
  }

  static getRouterPaths(router, prefix = '') {
    const paths = new Set();

    router.stack.forEach(layer => {
      if (layer.route) {
        const path = prefix + layer.route.path;
        paths.add(this.normalizePath(path));
      } else if (layer.name === 'router') {
        const newPrefix = prefix + (layer.regexp.source === '/' ? '' : layer.regexp.source);
        const nestedPaths = this.getRouterPaths(layer.handle, newPrefix);
        nestedPaths.forEach(path => paths.add(path));
      }
    });

    return Array.from(paths);
  }

  static getValidRoutes() {
    const routes = new Set();

    const addRoute = (route) => {
      if (typeof route === 'string') {
        routes.add(this.normalizePath(route));
      } else if (typeof route === 'function') {
        routes.add(this.normalizePath(route(':id')));
      }
    };

    const processRoutes = (obj) => {
      Object.values(obj).forEach(value => {
        if (typeof value === 'string' || typeof value === 'function') {
          addRoute(value);
        } else if (typeof value === 'object' && value !== null) {
          processRoutes(value);
        }
      });
    };

    processRoutes(API_ROUTES);
    return routes;
  }

  static normalizePath(path) {
    if (typeof path !== 'string') return '';
    
    return path
      .replace(/^\/+|\/+$/g, '')  // Remove leading/trailing slashes
      .replace(/\/+/g, '/')       // Replace multiple slashes
      .replace(/:\w+/g, ':id')    // Normalize parameters
      .toLowerCase();             // Case insensitive
  }
}

module.exports = RouteValidator;