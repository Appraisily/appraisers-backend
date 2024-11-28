const express = require('express');

class RouteValidator {
  static validateRoutes(router) {
    if (!(router instanceof express.Router)) {
      throw new Error('Invalid router instance');
    }

    // Validate that all mounted middleware are valid
    router.stack.forEach(layer => {
      if (layer.name === 'router' && !(layer.handle instanceof Function)) {
        throw new Error(`Invalid middleware in route: ${layer.regexp}`);
      }
    });

    return router;
  }
}

module.exports = RouteValidator;