/**
 * Global Error Handler Middleware
 * Catches all unhandled errors and returns structured JSON responses.
 */

const logger = require('../utils/logger');

/**
 * Express error-handling middleware (must have 4 params).
 */
function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`[${req.method}] ${req.originalUrl} — ${message}`, {
    statusCode,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

/**
 * Creates an operational error with a status code.
 * @param {string} message
 * @param {number} statusCode
 * @returns {Error}
 */
function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

module.exports = { errorHandler, createError };
