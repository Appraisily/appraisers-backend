const express = require('express');

class RouteValidator {
  static validateRoutes(router) {
    if (!(router instanceof express.Router)) {
      throw new Error('Invalid router instance');
    }

    // Get all routes recursively
    const routes = this.getRoutes(router);

    // Log validated routes
    console.log('Validated routes:', routes.map(r => r.path));

    return router;
  }

  static getRoutes(router, prefix = '') {
    const routes = [];

    router.stack.forEach(layer => {
      if (layer.route) {
        // Route handler
        routes.push({
          path: prefix + layer.route.path,
          methods: Object.keys(layer.route.methods)
        });
      } else if (layer.name === 'router') {
        // Nested router
        const newPrefix = prefix + (layer.regexp.source === '/' ? '' : layer.regexp.source);
        routes.push(...this.getRoutes(layer.handle, newPrefix));
      }
    });

    return routes;
  }
}

module.exports = RouteValidator;