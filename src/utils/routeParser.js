class RouteParser {
  parseRoutes(router, prefix = '') {
    const routes = [];

    if (!router.stack) {
      return routes;
    }

    router.stack.forEach(layer => {
      if (layer.route) {
        routes.push({
          path: this.normalizePath(prefix + layer.route.path),
          methods: Object.keys(layer.route.methods)
        });
      } else if (layer.name === 'router') {
        const newPrefix = prefix + this.getLayerPath(layer);
        routes.push(...this.parseRoutes(layer.handle, newPrefix));
      }
    });

    return routes;
  }

  normalizePath(path) {
    return path.replace(/\/{2,}/g, '/');  // Replace multiple slashes with single slash
  }

  getLayerPath(layer) {
    if (layer.regexp.source === '/^(?=\\/)?$/i') {
      return '';
    }
    return layer.regexp.source
      .replace(/^\^\\\//, '')     // Remove leading ^\/
      .replace(/\\\/\?\(\?\=.*$/, '') // Remove trailing regex
      .replace(/\\\//g, '/')      // Replace \/ with /
      .replace(/^\^|\$$/g, '')    // Remove ^ and $ anchors
      .replace(/\(\?:\([^\)]+\)\)\?/g, '') // Remove optional groups
      .replace(/\([^\)]+\)/g, '') // Remove remaining groups
      .replace(/\\(.)/g, '$1');   // Unescape characters
  }
}

module.exports = { RouteParser };