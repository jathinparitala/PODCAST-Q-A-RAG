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
  const message = err.isOperational ? err.message : 'Internal Server Error';

  logger.error(`[${req.method}] ${req.originalUrl} — ${err.message}`, {
    statusCode,
    operational: Boolean(err.isOperational),
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

module.exports = { errorHandler };
