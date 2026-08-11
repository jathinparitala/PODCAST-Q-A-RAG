/**
 * Podcast Transcript & PDF Q&A — Express Backend Server
 * Compatible with local dev, Vercel Serverless Functions, and Render Web Services.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const config = require('./config');
const logger = require('./utils/logger');
const { initDatabase } = require('./database/init');
const { errorHandler } = require('./middleware/errorHandler');

// Route Imports
const authRoutes = require('./routes/auth');
const podcastRoutes = require('./routes/podcasts');
const episodeRoutes = require('./routes/episodes');
const conversationRoutes = require('./routes/conversations');
const documentRoutes = require('./routes/documents');
const userRoutes = require('./routes/user');

const app = express();

// Ensure DB initialization on Vercel Serverless Function cold start
let dbInitialized = false;
app.use(async (req, res, next) => {
  if (!dbInitialized) {
    try {
      await initDatabase();
      dbInitialized = true;
    } catch (err) {
      logger.error('Failed to auto-init database on request:', err.message);
    }
  }
  next();
});

// Global Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin, matching clientUrl, or deployed on Vercel / Render
    if (!origin || origin === config.clientUrl || origin.includes('vercel.app') || origin.includes('onrender.com') || origin.includes('localhost')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Podcast Transcript & PDF Q&A API',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/podcasts', podcastRoutes);
app.use('/api/episodes', episodeRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/user', userRoutes);

// Production Static File Serving (for Render / Docker / standalone Node)
const clientDistPath = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // 404 Route for unhandled non-API paths in development
  app.use('*', (req, res) => {
    res.status(404).json({
      error: {
        message: `Endpoint ${req.originalUrl} not found on this server.`,
        code: 'NOT_FOUND'
      }
    });
  });
}

// Global Error Handler
app.use(errorHandler);

// Standalone Server Startup (for local dev or Render Web Services)
async function startServer() {
  try {
    await initDatabase();
    dbInitialized = true;

    app.listen(config.port, () => {
      logger.info(`Server running in ${config.nodeEnv} mode on http://localhost:${config.port}`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
