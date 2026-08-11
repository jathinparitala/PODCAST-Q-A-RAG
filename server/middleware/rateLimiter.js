/**
 * Rate Limiter Middleware
 * Simple in-memory rate limiter using a sliding window approach.
 * No external dependencies required.
 */

const config = require('../config');

// In-memory store: Map<ip, { timestamps: number[] }>
const clients = new Map();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of clients.entries()) {
    data.timestamps = data.timestamps.filter(
      (t) => now - t < config.rateLimitWindowMs
    );
    if (data.timestamps.length === 0) clients.delete(ip);
  }
}, 5 * 60 * 1000);

/**
 * Rate limiter middleware.
 * Limits requests per IP within a configurable time window.
 */
function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();

  if (!clients.has(ip)) {
    clients.set(ip, { timestamps: [] });
  }

  const client = clients.get(ip);

  // Remove timestamps outside the current window
  client.timestamps = client.timestamps.filter(
    (t) => now - t < config.rateLimitWindowMs
  );

  if (client.timestamps.length >= config.rateLimitMaxRequests) {
    return res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests. Please slow down and try again shortly.',
      },
    });
  }

  client.timestamps.push(now);
  next();
}

module.exports = rateLimiter;
