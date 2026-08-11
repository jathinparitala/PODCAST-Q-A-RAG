/**
 * Application error utilities.
 * Provides a consistent operational error class and helper.
 */

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

function createError(message, statusCode = 400) {
  return new AppError(message, statusCode);
}

module.exports = { AppError, createError };
