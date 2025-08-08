const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const { initDB, healthCheck } = require('./models/db');
const { logger, logSystemEvent } = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { corsOptions, rateLimiter, helmetConfig, requestLogger, sanitizeBody } = require('./middleware/security');
const workflowRoutes = require('./routes/workflow');
const scheduler = require('./services/scheduler');

/**
 * Initialize the application
 */
async function initializeApp() {
  try {
    // Initialize database
    await initDB();
    logger.info('Database initialized successfully');
    
    // Test database connection
    const dbHealthy = await healthCheck();
    if (!dbHealthy) {
      throw new Error('Database health check failed');
    }
    logger.info('Database health check passed');
    
    // Start scheduler
    await scheduler.start();
    logger.info('Scheduler started successfully');
    
    logSystemEvent('application_started', {
      version: '1.0.0',
      environment: config.nodeEnv,
      port: config.port
    });
    
  } catch (error) {
    logger.error('Failed to initialize application', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

/**
 * Create and configure Express app
 */
function createApp() {
  const app = express();
  
  // Security middleware
  app.use(helmet(helmetConfig));
  app.use(cors(corsOptions));
  app.use(rateLimiter);
  
  // Request parsing and logging
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(requestLogger);
  app.use(sanitizeBody);
  
  // Trust proxy for accurate IP addresses
  app.set('trust proxy', 1);
  
  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      const dbHealthy = await healthCheck();
      const schedulerHealthy = scheduler.isRunning;
      
      const status = dbHealthy && schedulerHealthy ? 'healthy' : 'unhealthy';
      const statusCode = status === 'healthy' ? 200 : 503;
      
      res.status(statusCode).json({
        status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.nodeEnv,
        services: {
          database: dbHealthy ? 'healthy' : 'unhealthy',
          scheduler: schedulerHealthy ? 'healthy' : 'unhealthy'
        }
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // API routes
  app.use('/api', workflowRoutes);
  
  // 404 handler
  app.use(notFound);
  
  // Error handling middleware (must be last)
  app.use(errorHandler);
  
  return app;
}

/**
 * Graceful shutdown handler
 */
function setupGracefulShutdown(app) {
  const gracefulShutdown = async (signal) => {
    logger.info(`Received ${signal}, starting graceful shutdown`);
    
    try {
      // Stop accepting new requests
      app.close(() => {
        logger.info('HTTP server closed');
      });
      
      // Stop scheduler
      scheduler.stop();
      logger.info('Scheduler stopped');
      
      // Close database connection
      const { closeDB } = require('./models/db');
      await closeDB();
      logger.info('Database connection closed');
      
      logSystemEvent('application_shutdown', {
        signal,
        uptime: process.uptime()
      });
      
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', {
        error: error.message
      });
      process.exit(1);
    }
  };
  
  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
      reason: reason?.message || reason,
      promise: promise
    });
    process.exit(1);
  });
}

/**
 * Start the server
 */
async function startServer() {
  try {
    // Initialize application
    await initializeApp();
    
    // Create Express app
    const app = createApp();
    
    // Setup graceful shutdown
    setupGracefulShutdown(app);
    
    // Start server
    const server = app.listen(config.port, () => {
      logger.info('Workflow Guard server started successfully', {
        port: config.port,
        environment: config.nodeEnv,
        nodeVersion: process.version,
        platform: process.platform
      });
    });
    
    // Handle server errors
    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }
      
      switch (error.code) {
        case 'EACCES':
          logger.error(`Port ${config.port} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`Port ${config.port} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });
    
  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { createApp, initializeApp };
