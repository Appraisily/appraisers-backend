const { API_ROUTES } = require('../constants/routes');

function validateRoutes(router) {
  // Get all defined routes from router
  const definedRoutes = router.stack
    .filter(layer => layer.route || (layer.name === 'router' && layer.handle.stack))
    .reduce((routes, layer) => {
      if (layer.route) {
        // Direct routes
        routes.push({
          path: `/api${layer.route.path}`,
          methods: Object.keys(layer.route.methods)
        });
      } else if (layer.name === 'router') {
        // Nested routes
        const prefix = layer.regexp.toString().match(/^\/\^(\\\/[^?]*)/)?.[1].replace(/\\/g, '') || '';
        layer.handle.stack
          .filter(nestedLayer => nestedLayer.route)
          .forEach(nestedLayer => {
            routes.push({
              path: `/api${prefix}${nestedLayer.route.path}`,
              methods: Object.keys(nestedLayer.route.methods)
            });
          });
      }
      return routes;
    }, []);

  // Get all expected routes
  const expectedRoutes = [
    ...Object.values(API_ROUTES.AUTH),
    ...Object.values(API_ROUTES.APPRAISALS),
    API_ROUTES.UPDATE_PENDING
  ];

  // Validate each defined route
  definedRoutes.forEach(({ path }) => {
    const normalizedPath = path.replace(/:\w+/g, ':id');
    const expectedPath = expectedRoutes.find(route => 
      route.replace(/:\w+/g, ':id') === normalizedPath
    );

    if (!expectedPath) {
      throw new Error(`Route ${path} is not defined in API_ROUTES`);
    }
  });

  // Validate handlers
  function validateHandler(layer) {
    if (layer.route) {
      layer.route.stack.forEach(routeLayer => {
        if (typeof routeLayer.handle !== 'function') {
          throw new Error(
            `Invalid handler for route ${layer.route.path}. Handler must be a function.`
          );
        }
      });
    } else if (layer.name === 'router') {
      layer.handle.stack.forEach(validateHandler);
    }
  }

  router.stack.forEach(validateHandler);

  return router;
}

module.exports = validateRoutes;