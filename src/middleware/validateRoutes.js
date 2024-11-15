const { API_ROUTES } = require('../constants/routes');

function validateRoutes(router) {
  const definedRoutes = router.stack
    .filter(layer => layer.route)
    .map(layer => ({
      path: `/api${layer.route.path}`,
      methods: Object.keys(layer.route.methods)
    }));

  const expectedRoutes = [
    ...Object.values(API_ROUTES.AUTH),
    ...Object.values(API_ROUTES.APPRAISALS),
    API_ROUTES.UPDATE_PENDING
  ];

  definedRoutes.forEach(({ path }) => {
    const normalizedPath = path.replace(/:\w+/g, ':id');
    const expectedPath = expectedRoutes.find(route => 
      route.replace(/:\w+/g, ':id') === normalizedPath
    );

    if (!expectedPath) {
      throw new Error(`Route ${path} is not defined in API_ROUTES`);
    }
  });

  router.stack.forEach(layer => {
    if (layer.route) {
      layer.route.stack.forEach(routeLayer => {
        if (typeof routeLayer.handle !== 'function') {
          throw new Error(
            `Invalid handler for route ${layer.route.path}. Handler must be a function.`
          );
        }
      });
    }
  });

  return router;
}

module.exports = validateRoutes;