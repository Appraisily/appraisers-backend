const { API_ROUTES } = require('../constants/routes');

class RouteValidator {
  static validateRoutes(router) {
    const definedRoutes = this.getDefinedRoutes(router);
    const expectedRoutes = this.getExpectedRoutes();
    
    this.validateDefinedRoutes(definedRoutes, expectedRoutes);
    this.validateHandlers(router);
    
    return router;
  }

  static getDefinedRoutes(router) {
    return router.stack
      .filter(layer => layer.route || (layer.name === 'router' && layer.handle.stack))
      .reduce((routes, layer) => {
        if (layer.route) {
          routes.push(this.processRoute(layer.route));
        } else if (layer.name === 'router') {
          routes.push(...this.processNestedRoutes(layer));
        }
        return routes;
      }, []);
  }

  static processRoute(route) {
    return {
      path: route.path,
      methods: Object.keys(route.methods)
    };
  }

  static processNestedRoutes(layer) {
    const prefix = this.getRoutePrefix(layer);
    return layer.handle.stack
      .filter(nestedLayer => nestedLayer.route)
      .map(nestedLayer => ({
        path: `${prefix}${nestedLayer.route.path}`,
        methods: Object.keys(nestedLayer.route.methods)
      }));
  }

  static getRoutePrefix(layer) {
    const match = layer.regexp.toString().match(/^\/\^(\\\/[^?]*)/);
    return match ? match[1].replace(/\\/g, '') : '';
  }

  static getExpectedRoutes() {
    return Object.values(API_ROUTES).reduce((routes, group) => {
      if (typeof group === 'string') {
        routes.push(this.normalizeRoutePath(group));
      } else {
        routes.push(...Object.values(group).map(this.normalizeRoutePath));
      }
      return routes;
    }, []);
  }

  static normalizeRoutePath(path) {
    return path.replace(/^\/api/, '').replace(/:\w+/g, ':id');
  }

  static validateDefinedRoutes(definedRoutes, expectedRoutes) {
    definedRoutes.forEach(({ path }) => {
      const normalizedPath = this.normalizeRoutePath(path);
      if (!expectedRoutes.includes(normalizedPath)) {
        throw new Error(`Route ${path} is not defined in API_ROUTES`);
      }
    });
  }

  static validateHandlers(router) {
    const validateLayer = (layer) => {
      if (layer.route) {
        layer.route.stack.forEach(routeLayer => {
          if (typeof routeLayer.handle !== 'function') {
            throw new Error(
              `Invalid handler for route ${layer.route.path}. Handler must be a function.`
            );
          }
        });
      } else if (layer.name === 'router') {
        layer.handle.stack.forEach(validateLayer);
      }
    };

    router.stack.forEach(validateLayer);
  }
}

module.exports = RouteValidator;