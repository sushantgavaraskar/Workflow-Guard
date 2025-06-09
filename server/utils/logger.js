const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../models/db');

function logEvaluation(ruleId, matched, input) {
  const db = getDB();

  const id = uuidv4();
  const executedAt = new Date().toISOString();
  const inputJson = JSON.stringify(input);

  db.run(
    `
    INSERT INTO workflow_logs (id, ruleId, matched, executedAt, input)
    VALUES (?, ?, ?, ?, ?)
    `,
    [id, ruleId, matched, executedAt, inputJson],
    (err) => {
      if (err) console.error('❌ Failed to log workflow:', err.message);
    }
  );
}

module.exports = { logEvaluation };
