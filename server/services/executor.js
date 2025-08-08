const axios = require('axios');
const config = require('../config');
const { logger, logWebhookExecution } = require('../utils/logger');

/**
 * Webhook Executor Service - Handles action execution with retry logic and error handling
 */
class ExecutorService {
  /**
   * Execute a list of actions
   */
  async executeActions(actions, data, context = {}) {
    const results = [];
    
    for (const action of actions) {
      try {
        const result = await this.executeAction(action, data, context);
        results.push(result);
      } catch (error) {
        logger.error('Action execution failed', {
          action,
          error: error.message,
          context
        });
        results.push({
          success: false,
          action,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  /**
   * Execute a single action
   */
  async executeAction(action, data, context = {}) {
    const startTime = Date.now();
    
    try {
      switch (action.type) {
        case 'webhook':
          return await this.executeWebhook(action, data, context);
        default:
          throw new Error(`Unsupported action type: ${action.type}`);
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logWebhookExecution(
        action.url || 'unknown',
        action.method || 'POST',
        null,
        executionTime,
        error
      );
      throw error;
    }
  }
  
  /**
   * Execute webhook action with retry logic
   */
  async executeWebhook(action, data, context = {}) {
    const { url, method = 'POST', headers = {}, timeout, retries = config.webhookMaxRetries } = action;
    const requestTimeout = timeout || config.webhookTimeoutMs;
    
    if (!url) {
      throw new Error('Webhook URL is required');
    }
    
    const requestConfig = {
      method: method.toUpperCase(),
      url,
      timeout: requestTimeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WorkflowGuard/1.0',
        'X-Workflow-Guard-Event': context.event || 'unknown',
        'X-Workflow-Guard-Rule': context.ruleId || 'unknown',
        ...headers
      },
      data: this.prepareWebhookData(data, action)
    };
    
    let lastError;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const startTime = Date.now();
        const response = await axios(requestConfig);
        const executionTime = Date.now() - startTime;
        
        logWebhookExecution(url, method, response.status, executionTime);
        
        logger.info('Webhook executed successfully', {
          url,
          method,
          statusCode: response.status,
          executionTime: `${executionTime}ms`,
          attempt,
          context
        });
        
        return {
          success: true,
          action,
          response: {
            status: response.status,
            statusText: response.statusText,
            data: response.data
          },
          executionTime,
          attempt
        };
      } catch (error) {
        lastError = error;
        const executionTime = Date.now() - startTime;
        
        logWebhookExecution(url, method, error.response?.status || null, executionTime, error);
        
        logger.warn('Webhook execution attempt failed', {
          url,
          method,
          attempt,
          maxRetries: retries,
          statusCode: error.response?.status,
          error: error.message,
          executionTime: `${executionTime}ms`,
          context
        });
        
        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
          break;
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await this.sleep(delay);
        }
      }
    }
    
    throw new Error(`Webhook execution failed after ${retries} attempts: ${lastError.message}`);
  }
  
  /**
   * Prepare webhook data based on action configuration
   */
  prepareWebhookData(data, action) {
    const payload = {
      timestamp: new Date().toISOString(),
      data: data
    };
    
    // Add custom payload transformation if specified
    if (action.transform) {
      try {
        payload.data = this.transformData(data, action.transform);
      } catch (error) {
        logger.error('Data transformation failed', {
          error: error.message,
          transform: action.transform
        });
        // Continue with original data if transformation fails
      }
    }
    
    // Add metadata if requested
    if (action.includeMetadata !== false) {
      payload.metadata = {
        source: 'workflow-guard',
        version: '1.0.0',
        actionId: action.id || 'unknown'
      };
    }
    
    return payload;
  }
  
  /**
   * Transform data based on transformation rules
   */
  transformData(data, transform) {
    if (typeof transform === 'function') {
      return transform(data);
    }
    
    if (typeof transform === 'object') {
      const result = {};
      for (const [key, path] of Object.entries(transform)) {
        result[key] = this.getNestedValue(data, path);
      }
      return result;
    }
    
    return data;
  }
  
  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
  
  /**
   * Sleep utility for retry delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Validate action configuration
   */
  validateAction(action) {
    const errors = [];
    
    if (!action.type) {
      errors.push('Action type is required');
    }
    
    if (action.type === 'webhook') {
      if (!action.url) {
        errors.push('Webhook URL is required');
      } else if (!this.isValidUrl(action.url)) {
        errors.push('Invalid webhook URL');
      }
      
      if (action.method && !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(action.method.toUpperCase())) {
        errors.push('Invalid HTTP method');
      }
      
      if (action.timeout && (typeof action.timeout !== 'number' || action.timeout < 1000 || action.timeout > 30000)) {
        errors.push('Timeout must be a number between 1000 and 30000 ms');
      }
      
      if (action.retries && (typeof action.retries !== 'number' || action.retries < 0 || action.retries > 10)) {
        errors.push('Retries must be a number between 0 and 10');
      }
    }
    
    return errors;
  }
  
  /**
   * Validate URL format
   */
  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }
}

module.exports = new ExecutorService();
