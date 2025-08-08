const ruleService = require('../services/ruleService');
const evaluator = require('../services/evaluator');
const executor = require('../services/executor');
const scheduler = require('../services/scheduler');
const { logger } = require('../utils/logger');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Rule Controller - Handles HTTP requests for rule management
 */
class RuleController {
  /**
   * Create a new rule
   */
  async createRule(req, res, next) {
    try {
      const rule = await ruleService.createRule(req.body);
      
      res.status(201).json({
        success: true,
        data: rule,
        message: 'Rule created successfully'
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get all rules with optional filtering
   */
  async getRules(req, res, next) {
    try {
      const filters = {
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
        hasSchedule: req.query.hasSchedule !== undefined ? req.query.hasSchedule === 'true' : undefined
      };
      
      const rules = await ruleService.getRules(filters);
      
      res.json({
        success: true,
        data: rules,
        count: rules.length
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get a single rule by ID
   */
  async getRuleById(req, res, next) {
    try {
      const { id } = req.params;
      const rule = await ruleService.getRuleById(id);
      
      res.json({
        success: true,
        data: rule
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Update a rule
   */
  async updateRule(req, res, next) {
    try {
      const { id } = req.params;
      const rule = await ruleService.updateRule(id, req.body);
      
      // Update scheduler if rule has schedule
      if (rule.schedule) {
        await scheduler.updateScheduledRule(rule);
      } else {
        scheduler.unscheduleRule(id);
      }
      
      res.json({
        success: true,
        data: rule,
        message: 'Rule updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Delete a rule
   */
  async deleteRule(req, res, next) {
    try {
      const { id } = req.params;
      await ruleService.deleteRule(id);
      
      // Remove from scheduler
      scheduler.unscheduleRule(id);
      
      res.json({
        success: true,
        message: 'Rule deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Bulk import rules
   */
  async bulkImportRules(req, res, next) {
    try {
      const result = await ruleService.bulkImportRules(req.body);
      
      // Reload scheduler to include new scheduled rules
      await scheduler.reload();
      
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Trigger rule evaluation
   */
  async triggerRules(req, res, next) {
    try {
      const { event, data } = req.body;
      
      // Get active rules
      const rules = await ruleService.getActiveRules();
      
      if (rules.length === 0) {
        return res.json({
          success: true,
          data: {
            event,
            matchedRules: [],
            totalRules: 0,
            message: 'No active rules found'
          }
        });
      }
      
      // Evaluate all rules
      const evaluationResults = evaluator.evaluateRules(rules, data, {
        event,
        trigger: 'manual'
      });
      
      const matchedRules = [];
      const executionResults = [];
      
      // Execute actions for matched rules
      for (const result of evaluationResults) {
        if (result.matched) {
          matchedRules.push({
            id: result.ruleId,
            name: result.ruleName
          });
          
          // Log the evaluation
          const { logWorkflow } = require('../utils/logger');
          logWorkflow(result.ruleId, true, data);
          
          // Execute actions
          const actions = await executor.executeActions(result.actions, data, {
            ruleId: result.ruleId,
            ruleName: result.ruleName,
            event,
            trigger: 'manual'
          });
          
          executionResults.push({
            ruleId: result.ruleId,
            ruleName: result.ruleName,
            actions
          });
        } else {
          // Log failed evaluation
          const { logWorkflow } = require('../utils/logger');
          logWorkflow(result.ruleId, false, data);
        }
      }
      
      res.json({
        success: true,
        data: {
          event,
          matchedRules,
          totalRules: rules.length,
          executionResults,
          message: `Processed ${rules.length} rules, ${matchedRules.length} matched`
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Test rule condition syntax
   */
  async testCondition(req, res, next) {
    try {
      const { condition, testData } = req.body;
      
      const result = evaluator.testConditionSyntax(condition);
      
      if (result.valid && testData) {
        const testResult = evaluator.createTestCondition(condition, testData);
        result.testResult = testResult;
      }
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get rule statistics
   */
  async getRuleStats(req, res, next) {
    try {
      const rules = await ruleService.getRules();
      const scheduledRules = await ruleService.getScheduledRules();
      
      const stats = {
        total: rules.length,
        active: rules.filter(r => r.isActive).length,
        inactive: rules.filter(r => !r.isActive).length,
        scheduled: scheduledRules.length,
        unscheduled: rules.filter(r => !r.schedule).length
      };
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Validate action configuration
   */
  async validateAction(req, res, next) {
    try {
      const { action } = req.body;
      
      const errors = executor.validateAction(action);
      
      res.json({
        success: true,
        data: {
          valid: errors.length === 0,
          errors
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Test cron expression
   */
  async testCronExpression(req, res, next) {
    try {
      const { expression } = req.body;
      
      const result = scheduler.testCronExpression(expression);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get scheduler status
   */
  async getSchedulerStatus(req, res, next) {
    try {
      const status = scheduler.getJobsStatus();
      
      res.json({
        success: true,
        data: {
          running: scheduler.isRunning,
          jobCount: status.length,
          jobs: status
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RuleController(); 