const fs = require('fs');
const path = require('path');

class RouteValidator {
  static validateControllerMethods(controller, requiredMethods) {
    const missingMethods = [];
    
    for (const method of requiredMethods) {
      if (typeof controller[method] !== 'function') {
        missingMethods.push(method);
      }
    }

    if (missingMethods.length > 0) {
      throw new Error(
        `Controller is missing required methods: ${missingMethods.join(', ')}`
      );
    }
  }

  static validateRouteHandler(handler) {
    if (typeof handler !== 'function') {
      throw new Error('Route handler must be a function');
    }

    // Check handler parameters
    const handlerStr = handler.toString();
    if (!handlerStr.includes('req') || !handlerStr.includes('res')) {
      throw new Error('Route handler must accept req and res parameters');
    }
  }

  static validateMiddleware(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }

    // Check middleware parameters
    const middlewareStr = middleware.toString();
    if (!middlewareStr.includes('req') || !middlewareStr.includes('res') || !middlewareStr.includes('next')) {
      throw new Error('Middleware must accept req, res, and next parameters');
    }
  }

  static validateRouter(router) {
    const stack = router.stack || [];
    
    for (const layer of stack) {
      if (layer.route) {
        // Validate route handlers
        const handlers = layer.route.stack
          .filter(handler => handler.handle)
          .map(handler => handler.handle);

        handlers.forEach(this.validateRouteHandler);
      } else if (layer.handle) {
        // Validate middleware
        this.validateMiddleware(layer.handle);
      }
    }
  }
}

module.exports = RouteValidator;