const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('../config');
const { logger } = require('../utils/logger');

const DB_PATH = config.dbPath;
let db = null;

/**
 * Initialize database connection and create tables
 */
function initDB() {
  return new Promise((resolve, reject) => {
    // Ensure data directory exists
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        logger.error('Database connection failed', { error: err.message });
        return reject(err);
      }
      
      logger.info('Database connected successfully', { path: DB_PATH });
      
      // Enable foreign keys and WAL mode for better performance
      db.run('PRAGMA foreign_keys = ON');
      db.run('PRAGMA journal_mode = WAL');
      db.run('PRAGMA synchronous = NORMAL');
      
      createTables()
        .then(() => {
          logger.info('Database tables initialized successfully');
          resolve();
        })
        .catch(reject);
    });
  });
}

/**
 * Create database tables
 */
function createTables() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Rules table
      db.run(`CREATE TABLE IF NOT EXISTS rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        conditions TEXT NOT NULL,
        actions TEXT NOT NULL,
        schedule TEXT,
        isActive BOOLEAN DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          logger.error('Failed to create rules table', { error: err.message });
          return reject(err);
        }
      });

      // Workflow logs table
      db.run(`CREATE TABLE IF NOT EXISTS workflow_logs (
        id TEXT PRIMARY KEY,
        ruleId TEXT NOT NULL,
        matched BOOLEAN NOT NULL,
        executedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        input TEXT,
        executionTime INTEGER,
        error TEXT,
        FOREIGN KEY (ruleId) REFERENCES rules (id) ON DELETE CASCADE
      )`, (err) => {
        if (err) {
          logger.error('Failed to create workflow_logs table', { error: err.message });
          return reject(err);
        }
      });

      // Create indexes for better performance
      db.run('CREATE INDEX IF NOT EXISTS idx_rules_active ON rules(isActive)');
      db.run('CREATE INDEX IF NOT EXISTS idx_rules_schedule ON rules(schedule)');
      db.run('CREATE INDEX IF NOT EXISTS idx_logs_ruleId ON workflow_logs(ruleId)');
      db.run('CREATE INDEX IF NOT EXISTS idx_logs_executedAt ON workflow_logs(executedAt)');
      db.run('CREATE INDEX IF NOT EXISTS idx_logs_matched ON workflow_logs(matched)');

      resolve();
    });
  });
}

/**
 * Get database instance
 */
function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return db;
}

/**
 * Execute a query with parameters
 */
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDB();
    
    database.all(sql, params, (err, rows) => {
      if (err) {
        logger.error('Database query failed', { 
          sql, 
          params, 
          error: err.message 
        });
        return reject(err);
      }
      resolve(rows);
    });
  });
}

/**
 * Execute a single row query
 */
function queryOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDB();
    
    database.get(sql, params, (err, row) => {
      if (err) {
        logger.error('Database query failed', { 
          sql, 
          params, 
          error: err.message 
        });
        return reject(err);
      }
      resolve(row);
    });
  });
}

/**
 * Execute an insert/update/delete query
 */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDB();
    
    database.run(sql, params, function(err) {
      if (err) {
        logger.error('Database run failed', { 
          sql, 
          params, 
          error: err.message 
        });
        return reject(err);
      }
      resolve({
        lastID: this.lastID,
        changes: this.changes
      });
    });
  });
}

/**
 * Execute a transaction
 */
function transaction(callback) {
  return new Promise((resolve, reject) => {
    const database = getDB();
    
    database.serialize(() => {
      database.run('BEGIN TRANSACTION');
      
      try {
        const result = callback();
        database.run('COMMIT', (err) => {
          if (err) {
            database.run('ROLLBACK');
            return reject(err);
          }
          resolve(result);
        });
      } catch (error) {
        database.run('ROLLBACK');
        reject(error);
      }
    });
  });
}

/**
 * Close database connection
 */
function closeDB() {
  return new Promise((resolve, reject) => {
    if (!db) {
      return resolve();
    }
    
    db.close((err) => {
      if (err) {
        logger.error('Failed to close database', { error: err.message });
        return reject(err);
      }
      
      logger.info('Database connection closed');
      db = null;
      resolve();
    });
  });
}

/**
 * Health check for database
 */
function healthCheck() {
  return new Promise((resolve, reject) => {
    if (!db) {
      return reject(new Error('Database not connected'));
    }
    
    db.get('SELECT 1 as health', (err, row) => {
      if (err) {
        return reject(err);
      }
      resolve(row && row.health === 1);
    });
  });
}

module.exports = {
  initDB,
  getDB,
  query,
  queryOne,
  run,
  transaction,
  closeDB,
  healthCheck
};
