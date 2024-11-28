const express = require('express');

class RouteValidator {
  static validateRoutes(router) {
    if (!(router instanceof express.Router)) {
      throw new Error('Invalid router instance');
    }
    return router;
  }
}

module.exports = RouteValidator;