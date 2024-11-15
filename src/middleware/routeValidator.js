const { API_ROUTES } = require('../constants/routes');
const { RouteError } = require('./errorHandler');

class RouteValidator {
  static validateRoutes(router) {
    try {
      const definedRoutes = this.getDefinedRoutes(router);
      const expectedRoutes = this.getExpectedRoutes();
      
      this.validateDefinedRoutes(definedRoutes, expectedRoutes);
      this.validateHandlers(router);
      
      return router;
    } catch (error) {
      console.error('Route validation failed:', error);
      throw error;
    }
  }

  static getDefinedRoutes(router) {
    const routes = [];
    
    function extractRoutes(stack, prefix = '') {
      stack.forEach(layer => {
        if (layer.route) {
          routes.push({
            path: prefix + layer.route.path,
            methods: Object.keys(layer.route.methods)
          });
        } else if (layer.name === 'router') {
          const newPrefix = prefix + (layer.regexp.source
            .replace(/^\^\\\//, '')
            .replace(/\\\/\?\(\?\=\\\/\|\$\)/, '')
            .replace(/\\\//g, '/'));
          extractRoutes(layer.handle.stack, newPrefix);
        }
      });
    }

    extractRoutes(router.stack);
    return routes;
  }

  static getExpectedRoutes() {
    return Object.entries(API_ROUTES).reduce((routes, [groupName, group]) => {
      if (typeof group === 'string') {
        routes.push(group);
      } else {
        Object.entries(group).forEach(([routeName, path]) => {
          routes.push(path);
        });
      }
      return routes;
    }, []);
  }

  static validateDefinedRoutes(definedRoutes, expectedRoutes) {
    definedRoutes.forEach(({ path, methods }) => {
      const normalizedPath = this.normalizePath(path);
      const matchingExpectedRoute = expectedRoutes.find(route => 
        this.normalizePath(route) === normalizedPath
      );

      if (!matchingExpectedRoute) {
        throw new RouteError(
          `Route ${path} is not defined in API_ROUTES`,
          404
        );
      }
    });
  }

  static validateHandlers(router) {
    const validateLayer = (layer) => {
      if (layer.route) {
        layer.route.stack.forEach(handler => {
          if (typeof handler.handle !== 'function') {
            throw new RouteError(
              `Invalid handler for route ${layer.route.path}`,
              500
            );
          }
        });
      } else if (layer.name === 'router') {
        layer.handle.stack.forEach(validateLayer);
      }
    };

    router.stack.forEach(validateLayer);
  }

  static normalizePath(path) {
    return path
      .replace(/^\/+|\/+$/g, '') // Remove leading/trailing slashes
      .replace(/:\w+/g, ':id')    // Normalize params
      .replace(/\/+/g, '/');      // Remove duplicate slashes
  }
}

module.exports = RouteValidator;