/**
 * Creates a logger with consistent formatting
 * @param {string} name - Logger name/component
 * @returns {object} - Logger object with log methods
 */
function createLogger(name) {
  return {
    info: (...args) => console.log(`[${name}]`, ...args),
    error: (...args) => console.error(`[${name}]`, ...args),
    warn: (...args) => console.warn(`[${name}]`, ...args),
    debug: (...args) => console.debug(`[${name}]`, ...args)
  };
}

module.exports = {
  createLogger
}; 