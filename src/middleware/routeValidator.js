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
    
    const extractRoutes = (stack, prefix = '') => {
      stack.forEach(layer => {
        if (layer.route) {
          const path = this.normalizePath(prefix + layer.route.path);
          routes.push({
            path,
            methods: Object.keys(layer.route.methods)
          });
        } else if (layer.name === 'router') {
          // Get router prefix
          const routerPath = layer.regexp.toString()
            .replace(/^\^\\\//, '')
            .replace(/\\\/\?\(\?\=\\\/\|\$\).*$/, '')
            .replace(/\\\//g, '/');
          
          // Recursively extract routes from nested router
          extractRoutes(layer.handle.stack, routerPath ? `${prefix}/${routerPath}` : prefix);
        }
      });
    };

    extractRoutes(router.stack);
    return routes;
  }

  static getExpectedRoutes() {
    const routes = [];
    
    Object.entries(API_ROUTES).forEach(([groupName, group]) => {
      if (typeof group === 'string') {
        routes.push(this.normalizePath(group));
      } else {
        Object.values(group).forEach(path => {
          routes.push(this.normalizePath(path));
        });
      }
    });

    return routes;
  }

  static validateDefinedRoutes(definedRoutes, expectedRoutes) {
    definedRoutes.forEach(({ path, methods }) => {
      const normalizedPath = this.normalizePath(path);
      
      // Check if path matches any expected route
      const isValidRoute = expectedRoutes.some(expectedPath => {
        const normalizedExpectedPath = this.normalizePath(expectedPath);
        return this.pathsMatch(normalizedPath, normalizedExpectedPath);
      });

      if (!isValidRoute) {
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
      .replace(/^\/+|\/+$/g, '')     // Remove leading/trailing slashes
      .replace(/\/+/g, '/')          // Remove duplicate slashes
      .replace(/\/$/, '');           // Remove trailing slash
  }

  static pathsMatch(path1, path2) {
    // Convert path params to wildcards for comparison
    const normalize = (path) => path
      .replace(/:\w+/g, ':param')    // Normalize param names
      .replace(/[\/\-_]/g, '')       // Remove separators
      .toLowerCase();                 // Case insensitive comparison

    return normalize(path1) === normalize(path2);
  }
}

module.exports = RouteValidator;