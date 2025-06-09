const cron = require('node-cron');
const { getDB } = require('../server/models/db');
const { evaluateRule } = require('../server/services/evaluator');
const { executeActions } = require('../server/services/executor');
const { logEvaluation } = require('../server/utils/logger');

function startScheduler() {
  const db = getDB();

  db.all('SELECT * FROM rules WHERE schedule IS NOT NULL', [], (err, rules) => {
    if (err) return console.error('❌ Failed to fetch scheduled rules:', err.message);

    rules.forEach((rule) => {
      const { id, name, schedule, conditions, actions } = rule;

      // Register this rule to cron
      try {
        cron.schedule(schedule, async () => {
          const parsedConditions = JSON.parse(conditions);
          const parsedActions = JSON.parse(actions);

          // In scheduled rules, default input could be static or empty
          const input = {}; // Customize this as needed per rule
          const matched = evaluateRule({ id, name, conditions: parsedConditions }, input);

          logEvaluation(id, matched, input);
          if (matched) await executeActions(parsedActions, input);

          console.log(`⏰ [${name}] schedule triggered: ${matched ? '✅ matched' : '❌ not matched'}`);
        });

        console.log(`🕒 Scheduled rule: ${name} → ${schedule}`);
      } catch (e) {
        console.error(`❌ Invalid cron for rule ${name}: ${schedule}`);
      }
    });
  });
}

module.exports = { startScheduler };
