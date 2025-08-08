const express = require('express');
const router = express.Router();
const ruleController = require('../controllers/ruleController');
const logController = require('../controllers/logController');
const { validate, schemas } = require('../middleware/validation');

// Rule management routes
router.post('/rules', validate(schemas.createRule), ruleController.createRule);
router.get('/rules', ruleController.getRules);
router.get('/rules/stats', ruleController.getRuleStats);
router.get('/rules/:id', ruleController.getRuleById);
router.put('/rules/:id', validate(schemas.createRule), ruleController.updateRule);
router.delete('/rules/:id', ruleController.deleteRule);

// Bulk operations
router.post('/rules/bulk', validate(schemas.bulkRules), ruleController.bulkImportRules);

// Rule evaluation and triggering
router.post('/trigger', validate(schemas.trigger), ruleController.triggerRules);

// Rule testing and validation
router.post('/rules/test-condition', ruleController.testCondition);
router.post('/rules/validate-action', ruleController.validateAction);
router.post('/rules/test-cron', ruleController.testCronExpression);

// Scheduler management
router.get('/scheduler/status', ruleController.getSchedulerStatus);

// Log management routes
router.get('/logs', logController.getLogs);
router.get('/logs/stats', logController.getLogStats);
router.get('/logs/export', logController.exportLogs);
router.get('/rules/:ruleId/logs', logController.getRuleLogs);
router.delete('/logs', logController.clearOldLogs);

module.exports = router;
