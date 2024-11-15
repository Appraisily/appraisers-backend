function validateRoutes(router) {
  // Validate all routes before mounting
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