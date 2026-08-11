/**
 * Podcast Transcript Q&A — Express Backend Server
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

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

// Global Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts/styles for development
}));

app.use(cors({
  origin: config.clientUrl || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' })); // Larger limit for PDF & transcript uploads
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Podcast Transcript Q&A API',
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

// 404 Route
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: `Endpoint ${req.originalUrl} not found on this server.`,
      code: 'NOT_FOUND'
    }
  });
});

// Global Error Handler
app.use(errorHandler);

// Database initialization and server startup
async function startServer() {
  try {
    await initDatabase();

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
