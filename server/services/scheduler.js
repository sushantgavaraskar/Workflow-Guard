const cron = require('node-cron');
const { logger, logSystemEvent } = require('../utils/logger');
const ruleService = require('./ruleService');
const evaluator = require('./evaluator');
const executor = require('./executor');
const { logWorkflow } = require('../utils/logger');
const config = require('../config');

/**
 * Scheduler Service - Manages scheduled rule execution
 */
class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }
  
  /**
   * Start the scheduler
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }
    
    if (!config.cronEnabled) {
      logger.info('Scheduler is disabled in configuration');
      return;
    }
    
    try {
      await this.loadScheduledRules();
      this.isRunning = true;
      
      logSystemEvent('scheduler_started', {
        jobCount: this.jobs.size
      });
      
      logger.info('Scheduler started successfully', {
        jobCount: this.jobs.size
      });
    } catch (error) {
      logger.error('Failed to start scheduler', {
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Stop the scheduler
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Scheduler is not running');
      return;
    }
    
    // Stop all running jobs
    for (const [ruleId, job] of this.jobs.entries()) {
      job.stop();
      logger.info('Stopped scheduled job', { ruleId });
    }
    
    this.jobs.clear();
    this.isRunning = false;
    
    logSystemEvent('scheduler_stopped');
    logger.info('Scheduler stopped successfully');
  }
  
  /**
   * Load and schedule all active rules with cron schedules
   */
  async loadScheduledRules() {
    try {
      const rules = await ruleService.getScheduledRules();
      
      for (const rule of rules) {
        await this.scheduleRule(rule);
      }
      
      logger.info('Loaded scheduled rules', {
        count: rules.length
      });
    } catch (error) {
      logger.error('Failed to load scheduled rules', {
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Schedule a single rule
   */
  async scheduleRule(rule) {
    if (!rule.schedule) {
      logger.warn('Rule has no schedule', { ruleId: rule.id });
      return;
    }
    
    // Stop existing job if it exists
    if (this.jobs.has(rule.id)) {
      this.jobs.get(rule.id).stop();
    }
    
    try {
      // Validate cron expression
      if (!cron.validate(rule.schedule)) {
        throw new Error(`Invalid cron expression: ${rule.schedule}`);
      }
      
      // Create the scheduled job
      const job = cron.schedule(rule.schedule, async () => {
        await this.executeScheduledRule(rule);
      }, {
        scheduled: false,
        timezone: 'UTC'
      });
      
      // Start the job
      job.start();
      
      // Store the job reference
      this.jobs.set(rule.id, job);
      
      logger.info('Scheduled rule', {
        ruleId: rule.id,
        ruleName: rule.name,
        schedule: rule.schedule
      });
      
    } catch (error) {
      logger.error('Failed to schedule rule', {
        ruleId: rule.id,
        ruleName: rule.name,
        schedule: rule.schedule,
        error: error.message
      });
    }
  }
  
  /**
   * Unschedule a rule
   */
  unscheduleRule(ruleId) {
    if (this.jobs.has(ruleId)) {
      const job = this.jobs.get(ruleId);
      job.stop();
      this.jobs.delete(ruleId);
      
      logger.info('Unscheduled rule', { ruleId });
    }
  }
  
  /**
   * Execute a scheduled rule
   */
  async executeScheduledRule(rule) {
    const startTime = Date.now();
    
    try {
      logger.info('Executing scheduled rule', {
        ruleId: rule.id,
        ruleName: rule.name,
        schedule: rule.schedule
      });
      
      // For scheduled rules, we typically use a default or empty data set
      // This can be customized based on the rule's requirements
      const inputData = this.generateScheduledInput(rule);
      
      // Evaluate the rule
      const matched = evaluator.evaluateRule(rule.conditions, inputData, {
        ruleId: rule.id,
        ruleName: rule.name,
        trigger: 'scheduled'
      });
      
      // Log the evaluation
      logWorkflow(rule.id, matched, inputData);
      
      // Execute actions if rule matched
      if (matched) {
        const executionResults = await executor.executeActions(rule.actions, inputData, {
          ruleId: rule.id,
          ruleName: rule.name,
          event: 'scheduled',
          trigger: 'scheduled'
        });
        
        const executionTime = Date.now() - startTime;
        
        logger.info('Scheduled rule execution completed', {
          ruleId: rule.id,
          ruleName: rule.name,
          matched: true,
          executionTime: `${executionTime}ms`,
          actionResults: executionResults
        });
      } else {
        const executionTime = Date.now() - startTime;
        
        logger.info('Scheduled rule evaluation completed (no match)', {
          ruleId: rule.id,
          ruleName: rule.name,
          matched: false,
          executionTime: `${executionTime}ms`
        });
      }
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error('Scheduled rule execution failed', {
        ruleId: rule.id,
        ruleName: rule.name,
        error: error.message,
        executionTime: `${executionTime}ms`
      });
      
      // Log the failed execution
      logWorkflow(rule.id, false, {}, error.message);
    }
  }
  
  /**
   * Generate input data for scheduled rule execution
   */
  generateScheduledInput(rule) {
    // Default input for scheduled rules
    const baseInput = {
      timestamp: new Date().toISOString(),
      trigger: 'scheduled',
      ruleId: rule.id,
      ruleName: rule.name
    };
    
    // Custom input generation based on rule configuration
    if (rule.scheduledInput) {
      return { ...baseInput, ...rule.scheduledInput };
    }
    
    return baseInput;
  }
  
  /**
   * Get all scheduled jobs status
   */
  getJobsStatus() {
    const status = [];
    
    for (const [ruleId, job] of this.jobs.entries()) {
      status.push({
        ruleId,
        running: job.running,
        nextDate: job.nextDate()
      });
    }
    
    return status;
  }
  
  /**
   * Reload all scheduled rules
   */
  async reload() {
    logger.info('Reloading scheduled rules');
    
    // Stop all current jobs
    this.stop();
    
    // Reload and restart
    await this.start();
  }
  
  /**
   * Update a scheduled rule
   */
  async updateScheduledRule(rule) {
    if (rule.schedule) {
      await this.scheduleRule(rule);
    } else {
      this.unscheduleRule(rule.id);
    }
  }
  
  /**
   * Test a cron expression
   */
  testCronExpression(expression) {
    try {
      if (!cron.validate(expression)) {
        return {
          valid: false,
          error: 'Invalid cron expression format'
        };
      }
      
      // Get next 5 execution times
      const nextDates = [];
      const job = cron.schedule(expression, () => {}, { scheduled: false });
      
      for (let i = 0; i < 5; i++) {
        const nextDate = job.nextDate();
        nextDates.push(nextDate.toISOString());
      }
      
      job.stop();
      
      return {
        valid: true,
        nextExecutions: nextDates
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
}

module.exports = new SchedulerService();
