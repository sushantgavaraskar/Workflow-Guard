const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const evaluator = require('../services/evaluator');
const executor = require('../services/executor');
const { logWorkflow } = require('../utils/logger');

// Create a single rule
router.post('/rules', (req, res) => {
  const { name, conditions, actions, schedule } = req.body;

  if (!name || !conditions || !actions) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO rules (id, name, conditions, actions, schedule)
      VALUES (?, ?, ?, ?, ?)
    `);

    const id = uuidv4();
    stmt.run(id, name, JSON.stringify(conditions), JSON.stringify(actions), schedule || null);
    res.status(201).json({ message: 'Rule created successfully', id });
  } catch (err) {
    console.error('Error creating rule:', err);
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

// Get all rules
router.get('/rules', (req, res) => {
  try {
    const rules = db.prepare(`SELECT * FROM rules`).all();
    res.json(rules);
  } catch (err) {
    console.error('Error fetching rules:', err);
    res.status(500).json({ error: 'Failed to retrieve rules' });
  }
});

// Bulk import rules
router.post('/rules/bulk', (req, res) => {
  const rules = req.body;

  if (!Array.isArray(rules)) {
    return res.status(400).json({ error: 'Payload must be an array of rules' });
  }

  const insert = db.prepare(`
    INSERT INTO rules (id, name, conditions, actions, schedule)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((rules) => {
    for (const rule of rules) {
      if (!rule.name || !rule.conditions || !rule.actions) {
        throw new Error('Missing required fields in rule');
      }
      insert.run(
        uuidv4(),
        rule.name,
        JSON.stringify(rule.conditions),
        JSON.stringify(rule.actions),
        rule.schedule || null
      );
    }
  });

  try {
    insertMany(rules);
    res.status(201).json({ message: 'Rules imported successfully' });
  } catch (err) {
    console.error('Bulk rule insert failed:', err);
    res.status(500).json({ error: 'Failed to import rules' });
  }
});

// Trigger rule evaluation
router.post('/trigger', (req, res) => {
  const { event, data } = req.body;

  if (!event || !data) {
    return res.status(400).json({ error: 'Missing event or data' });
  }

  try {
    const rules = db.prepare(`SELECT * FROM rules`).all();
    const matchedRules = [];

    rules.forEach(rule => {
      const parsedConditions = JSON.parse(rule.conditions);
      const parsedActions = JSON.parse(rule.actions);
      const matched = evaluator.evaluateRule(parsedConditions, data);
      logWorkflow(rule.id, matched, data);
      if (matched) {
        executor.executeActions(parsedActions, data);
        matchedRules.push(rule.name);
      }
    });

    res.json({
      message: 'Trigger processed',
      matchedRules
    });
  } catch (err) {
    console.error('Error processing trigger:', err);
    res.status(500).json({ error: 'Failed to evaluate rules' });
  }
});

// Get logs
router.get('/logs', (req, res) => {
  try {
    const logs = db.prepare(`SELECT * FROM workflow_logs ORDER BY executedAt DESC`).all();
    res.json(logs);
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});

module.exports = router;
