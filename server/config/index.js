require('dotenv').config();

const config = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  dbPath: process.env.DB_PATH || './data/workflow.db',
  
  // Security Configuration
  corsOrigin: process.env.CORS_ORIGIN || '*', // Allow all origins for API service
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  
  // Logging Configuration
  logLevel: process.env.LOG_LEVEL || 'info',
  logFile: process.env.LOG_FILE || './logs/app.log',
  
  // Webhook Configuration
  webhookTimeoutMs: parseInt(process.env.WEBHOOK_TIMEOUT_MS) || 10000,
  webhookMaxRetries: parseInt(process.env.WEBHOOK_MAX_RETRIES) || 3,
  
  // Cron Configuration
  cronEnabled: process.env.CRON_ENABLED !== 'false',
  
  // API Configuration
  apiVersion: process.env.API_VERSION || 'v1',
  apiPrefix: process.env.API_PREFIX || '/api',
  
  // Validation
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test'
};

module.exports = config; 