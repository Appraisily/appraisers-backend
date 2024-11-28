const { API_ROUTES } = require('../constants/routes');
const { normalizeRoute, cleanPath } = require('../utils/routeUtils');

class RouteValidator {
  static validateRoutes(router) {
    const routes = this.getRoutes(router);
    const definedRoutes = this.getAllDefinedRoutes();
    
    for (const route of routes) {
      const normalizedPath = normalizeRoute(route.path);
      if (!this.isValidRoute(normalizedPath, definedRoutes)) {
        throw new Error(`Route ${route.path} is not defined in API_ROUTES`);
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
        const newPrefix = prefix + (layer.regexp.source === '/' ? '' : cleanPath(layer.regexp));
        routes.push(...this.getRoutes(layer.handle, newPrefix));
      }
    });

    return routes;
  }

  static isValidRoute(path, definedRoutes) {
    return definedRoutes.some(route => 
      normalizeRoute(route) === path
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