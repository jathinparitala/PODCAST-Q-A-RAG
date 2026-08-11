/**
 * Authentication Middleware
 * Validates JWT access token from HTTP-only cookie or Authorization header.
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

function authenticateToken(req, res, next) {
  let token = null;

  // 1. Check HTTP-only cookie
  if (req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }
  // 2. Fallback to Authorization Header (Bearer token)
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      error: {
        message: 'Authentication required. Please log in to continue.',
        code: 'UNAUTHORIZED'
      }
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const authService = require('../services/authService');
    const user = authService.getUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        error: {
          message: 'User session invalid or user no longer exists.',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: {
          message: 'Session expired. Please re-authenticate.',
          code: 'TOKEN_EXPIRED'
        }
      });
    }

    return res.status(401).json({
      error: {
        message: 'Invalid authentication token.',
        code: 'INVALID_TOKEN'
      }
    });
  }
}

/**
 * Optional authentication middleware - attaches user if token is valid,
 * but does not block unauthenticated requests.
 */
function optionalAuth(req, res, next) {
  let token = null;
  if (req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const authService = require('../services/authService');
    req.user = authService.getUserById(decoded.userId) || null;
  } catch (err) {
    req.user = null;
  }

  next();
}

module.exports = { authenticateToken, optionalAuth };
