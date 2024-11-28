const { API_ROUTES } = require('../constants/routes');
const { RouteParser } = require('../utils/routeParser');
const { RouteNormalizer } = require('../utils/routeNormalizer');

class RouteValidator {
  static validateRoutes(router) {
    const routeParser = new RouteParser();
    const routes = routeParser.parseRoutes(router);
    const definedRoutes = this.getDefinedRoutes();

    for (const route of routes) {
      const normalizedPath = RouteNormalizer.normalize(route.path);
      if (!this.isValidRoute(normalizedPath, definedRoutes)) {
        throw new Error(`Route '${route.path}' is not defined in API_ROUTES`);
      }
    }

    return router;
  }

  static isValidRoute(path, definedRoutes) {
    return definedRoutes.some(route => 
      RouteNormalizer.normalize(route) === path
    );
  }

  static getDefinedRoutes() {
    const routes = [];
    
    const processRoutes = (obj) => {
      Object.values(obj).forEach(value => {
        if (typeof value === 'string') {
          routes.push(value);
        } else if (typeof value === 'function') {
          // Handle dynamic routes with :id parameter
          routes.push(value(':id'));
        } else if (typeof value === 'object' && value !== null) {
          processRoutes(value);
        }
      });
    };

    processRoutes(API_ROUTES);
    return routes;
  }
}

module.exports = RouteValidator;