const winston = require('winston');

/**
 * Creates a logger instance with a specific module name
 * @param {string} module - The module name to be used in log messages
 * @returns {object} Winston logger instance
 */
const createLogger = (module) => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf(({ level, message, timestamp }) => {
        return `${timestamp} [${module}] ${level.toUpperCase()}: ${message}`;
      })
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ]
  });
};

module.exports = { createLogger }; 