class RouteNormalizer {
  static normalize(path) {
    if (typeof path !== 'string') {
      return '';
    }

    return path
      .replace(/^\/+|\/+$/g, '')  // Remove leading/trailing slashes
      .replace(/\/+/g, '/')       // Replace multiple slashes with single slash
      .replace(/:\w+/g, ':id')    // Normalize parameters to :id
      .toLowerCase();             // Case insensitive comparison
  }

  static stripRegexSyntax(str) {
    return str
      .replace(/^\^|\$$/g, '')    // Remove ^ and $ anchors
      .replace(/\\/g, '')         // Remove escapes
      .replace(/\([^)]*\)/g, ''); // Remove groups
  }
}

module.exports = { RouteNormalizer };