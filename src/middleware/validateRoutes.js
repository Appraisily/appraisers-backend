const { API_ROUTES } = require('../constants/routes');

function validateRoutes(router) {
  // Get all defined routes from router
  const definedRoutes = router.stack
    .filter(layer => layer.route)
    .map(layer => {
      const path = layer.route.path;
      const methods = Object.keys(layer.route.methods);
      return { path: `/api${path}`, methods };
    });

  // Get all expected routes
  const expectedRoutes = Object.values(API_ROUTES)
    .reduce((acc, group) => {
      if (typeof group === 'object') {
        return [...acc, ...Object.values(group)];
      }
      return [...acc, group];
    }, [])
    .filter(route => typeof route === 'string');

  // Check for undefined routes
  definedRoutes.forEach(({ path, methods }) => {
    if (!expectedRoutes.includes(path)) {
      throw new Error(`Route ${path} is not defined in API_ROUTES`);
    }
  });

  // Validate route handlers
  router.stack.forEach(layer => {
    if (layer.route) {
      const path = layer.route.path;
      layer.route.stack.forEach(routeLayer => {
        const handler = routeLayer.handle;
        if (typeof handler !== 'function') {
          throw new Error(`Invalid handler for route ${path}. Handler must be a function.`);
        }
      });
    }
  });

  return router;
}

module.exports = validateRoutes;