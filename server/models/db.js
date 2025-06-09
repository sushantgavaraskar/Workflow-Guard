const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/workflow.db');
let db;

function initDB() {
  db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) return console.error('DB Error:', err.message);
    console.log('🗃️ Connected to SQLite DB');
  });

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS rules (
      id TEXT PRIMARY KEY,
      name TEXT,
      conditions TEXT,
      actions TEXT,
      schedule TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS workflow_logs (
      id TEXT PRIMARY KEY,
      ruleId TEXT,
      matched BOOLEAN,
      executedAt TEXT,
      input TEXT
    )`);
  });
}

function getDB() {
  return db;
}

module.exports = { initDB, getDB };
