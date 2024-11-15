const RouteValidator = require('../utils/routeValidator');

function validateRoutes(router) {
  return (req, res, next) => {
    try {
      RouteValidator.validateRouter(router);
      next();
    } catch (error) {
      console.error('Route validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }
  };
}

module.exports = validateRoutes;