const { API_ROUTES, routeHelpers } = require('../constants/routes');

class RouteValidator {
  static validateRoutes(router) {
    const routes = this.getRoutes(router);
    
    routes.forEach(route => {
      if (!routeHelpers.validatePath(route.path)) {
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
        const newPrefix = prefix + (layer.regexp.source === '/' ? '' : layer.regexp.source);
        routes.push(...this.getRoutes(layer.handle, newPrefix));
      }
    });

    return routes;
  }
}

module.exports = RouteValidator;