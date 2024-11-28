const { API_ROUTES } = require('../constants/routes');

class RouteValidator {
  static validateRoutes(router) {
    const routes = this.getRoutes(router);
    
    for (const route of routes) {
      const normalizedPath = this.normalizePath(route.path);
      if (!this.isValidRoute(normalizedPath)) {
        throw new Error(`Invalid route: ${route.path}`);
      }
    }

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
        const newPrefix = prefix + (layer.regexp.source === '/' ? '' : this.cleanPath(layer.regexp));
        routes.push(...this.getRoutes(layer.handle, newPrefix));
      }
    });

    return routes;
  }

  static normalizePath(path) {
    if (typeof path !== 'string') {
      return '';
    }
    return path
      .replace(/^\/+|\/+$/g, '')
      .replace(/\/+/g, '/')
      .replace(/:\w+/g, ':id');
  }

  static cleanPath(regexp) {
    const path = regexp.toString()
      .replace(/^\^\\\//, '')
      .replace(/\\\/\?\(\?\=.*$/, '')
      .replace(/\\\//g, '/')
      .replace(/^\^|\$$/g, '')
      .replace(/\(\?:\([^\)]+\)\)\?/g, '')
      .replace(/\([^\)]+\)/g, '')
      .replace(/\\(.)/g, '$1');
    return path;
  }

  static isValidRoute(path) {
    const definedRoutes = this.getAllDefinedRoutes();
    const normalizedPath = this.normalizePath(path);
    return definedRoutes.some(route => 
      this.normalizePath(route) === normalizedPath
    );
  }

  static getAllDefinedRoutes() {
    const routes = [];
    
    const addRoutes = (obj) => {
      Object.values(obj).forEach(value => {
        if (typeof value === 'string') {
          routes.push(value);
        } else if (typeof value === 'function') {
          routes.push(value(':id'));
        } else if (typeof value === 'object' && value !== null) {
          addRoutes(value);
        }
      });
    };

    addRoutes(API_ROUTES);
    return routes;
  }
}

module.exports = RouteValidator;