/**
 * Server Configuration
 * Centralizes all environment variables with sensible defaults.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',

  // Database
  dbPath: process.env.DB_PATH
    ? path.resolve(__dirname, '..', process.env.DB_PATH)
    : path.resolve(__dirname, '..', 'database', 'podcast_qa.db'),

  // CORS
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'podcast_qa_jwt_secret_key_2026',
  refreshSecret: process.env.REFRESH_SECRET || 'podcast_qa_refresh_secret_2026',

  // AI Provider
  aiProvider: process.env.AI_PROVIDER || 'gemini',
  aiApiKey: process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 30,
};

module.exports = config;
