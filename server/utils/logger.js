const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Ensure logs directory exists
const logsDir = path.dirname(config.logFile);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: config.logFile,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    // Separate error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  exitOnError: false
});

// Add request ID to logs if available
logger.request = (req, level, message, meta = {}) => {
  const logData = {
    ...meta,
    requestId: req.headers['x-request-id'] || 'unknown',
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    method: req.method,
    url: req.url
  };
  
  logger.log(level, message, logData);
};

/**
 * Log workflow evaluation
 */
function logWorkflow(ruleId, matched, input) {
  const { v4: uuidv4 } = require('uuid');
  const { getDB } = require('../models/db');

  const db = getDB();
  const id = uuidv4();
  const executedAt = new Date().toISOString();
  const inputJson = JSON.stringify(input);

  db.run(
    `INSERT INTO workflow_logs (id, ruleId, matched, executedAt, input)
     VALUES (?, ?, ?, ?, ?)`,
    [id, ruleId, matched, executedAt, inputJson],
    (err) => {
      if (err) {
        logger.error('Failed to log workflow evaluation', {
          error: err.message,
          ruleId,
          matched,
          input: inputJson
        });
      } else {
        logger.info('Workflow evaluation logged', {
          logId: id,
          ruleId,
          matched,
          executedAt
        });
      }
    }
  );
}

/**
 * Log webhook execution
 */
function logWebhookExecution(url, method, statusCode, responseTime, error = null) {
  const logData = {
    url,
    method,
    statusCode,
    responseTime: `${responseTime}ms`
  };

  if (error) {
    logger.error('Webhook execution failed', {
      ...logData,
      error: error.message
    });
  } else {
    logger.info('Webhook executed successfully', logData);
  }
}

/**
 * Log rule creation/update
 */
function logRuleOperation(operation, ruleId, ruleName, userId = 'system') {
  logger.info(`Rule ${operation}`, {
    ruleId,
    ruleName,
    userId,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log system events
 */
function logSystemEvent(event, details = {}) {
  logger.info(`System Event: ${event}`, {
    ...details,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  logger,
  logWorkflow,
  logWebhookExecution,
  logRuleOperation,
  logSystemEvent
};
