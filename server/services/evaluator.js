const jsonLogic = require('json-logic-js');
const { logger } = require('../utils/logger');

/**
 * Rule Evaluator Service - Handles rule condition evaluation with validation and error handling
 */
class EvaluatorService {
  /**
   * Evaluate a rule condition against data
   */
  evaluateRule(condition, data, context = {}) {
    const startTime = Date.now();
    
    try {
      // Validate condition structure
      this.validateCondition(condition);
      
      // Preprocess data for evaluation
      const processedData = this.preprocessData(data);
      
      // Evaluate the condition
      const result = jsonLogic.apply(condition, processedData);
      
      const executionTime = Date.now() - startTime;
      
      logger.info('Rule evaluation completed', {
        condition: JSON.stringify(condition),
        result: Boolean(result),
        executionTime: `${executionTime}ms`,
        context
      });
      
      return Boolean(result);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error('Rule evaluation failed', {
        condition: JSON.stringify(condition),
        error: error.message,
        executionTime: `${executionTime}ms`,
        context
      });
      
      // Return false for invalid conditions to prevent false positives
      return false;
    }
  }
  
  /**
   * Evaluate multiple rules against data
   */
  evaluateRules(rules, data, context = {}) {
    const results = [];
    
    for (const rule of rules) {
      try {
        const matched = this.evaluateRule(rule.conditions, data, {
          ...context,
          ruleId: rule.id,
          ruleName: rule.name
        });
        
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          matched,
          conditions: rule.conditions,
          actions: rule.actions
        });
      } catch (error) {
        logger.error('Rule evaluation failed for specific rule', {
          ruleId: rule.id,
          ruleName: rule.name,
          error: error.message,
          context
        });
        
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          matched: false,
          error: error.message,
          conditions: rule.conditions,
          actions: rule.actions
        });
      }
    }
    
    return results;
  }
  
  /**
   * Validate condition structure
   */
  validateCondition(condition) {
    if (!condition || typeof condition !== 'object') {
      throw new Error('Condition must be a valid JSON object');
    }
    
    // Check for circular references
    this.checkCircularReferences(condition);
    
    // Validate JSON Logic operators
    this.validateJsonLogicOperators(condition);
  }
  
  /**
   * Check for circular references in condition object
   */
  checkCircularReferences(obj, seen = new WeakSet()) {
    if (obj && typeof obj === 'object') {
      if (seen.has(obj)) {
        throw new Error('Circular reference detected in condition');
      }
      seen.add(obj);
      
      for (const value of Object.values(obj)) {
        this.checkCircularReferences(value, seen);
      }
    }
  }
  
  /**
   * Validate JSON Logic operators
   */
  validateJsonLogicOperators(condition) {
    const validOperators = [
      '==', '===', '!=', '!==', '<', '<=', '>', '>=',
      'and', 'or', 'not', 'in', '!in',
      'var', 'missing', 'missing_some',
      'cat', 'substr', 'log', 'log10',
      'abs', 'ceil', 'floor', 'round',
      'max', 'min', '+', '-', '*', '/', '%',
      'merge', 'all', 'none', 'some',
      'if', '?:', 'map', 'reduce', 'filter'
    ];
    
    for (const [key, value] of Object.entries(condition)) {
      if (validOperators.includes(key)) {
        // Validate operator arguments
        this.validateOperatorArguments(key, value);
      } else if (key !== 'var' && typeof value === 'object' && value !== null) {
        // Recursively validate nested conditions
        this.validateJsonLogicOperators(value);
      }
    }
  }
  
  /**
   * Validate operator arguments
   */
  validateOperatorArguments(operator, args) {
    if (!Array.isArray(args)) {
      throw new Error(`Operator '${operator}' requires an array of arguments`);
    }
    
    switch (operator) {
      case '==':
      case '===':
      case '!=':
      case '!==':
      case '<':
      case '<=':
      case '>':
      case '>=':
        if (args.length !== 2) {
          throw new Error(`Comparison operator '${operator}' requires exactly 2 arguments`);
        }
        break;
        
      case 'and':
      case 'or':
        if (args.length < 2) {
          throw new Error(`Logical operator '${operator}' requires at least 2 arguments`);
        }
        break;
        
      case 'not':
        if (args.length !== 1) {
          throw new Error("Logical operator 'not' requires exactly 1 argument");
        }
        break;
        
      case 'var':
        if (args.length !== 1 || typeof args[0] !== 'string') {
          throw new Error("Operator 'var' requires exactly 1 string argument");
        }
        break;
        
      case 'in':
      case '!in':
        if (args.length !== 2) {
          throw new Error(`Membership operator '${operator}' requires exactly 2 arguments`);
        }
        break;
    }
  }
  
  /**
   * Preprocess data for evaluation
   */
  preprocessData(data) {
    if (!data || typeof data !== 'object') {
      return {};
    }
    
    // Create a copy to avoid modifying original data
    const processed = { ...data };
    
    // Convert undefined values to null for JSON Logic compatibility
    for (const [key, value] of Object.entries(processed)) {
      if (value === undefined) {
        processed[key] = null;
      }
    }
    
    return processed;
  }
  
  /**
   * Test condition syntax without evaluation
   */
  testConditionSyntax(condition) {
    try {
      this.validateCondition(condition);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
  
  /**
   * Get condition variables (fields referenced in the condition)
   */
  extractVariables(condition) {
    const variables = new Set();
    
    const extractVars = (obj) => {
      if (obj && typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj)) {
          if (key === 'var' && Array.isArray(value) && value.length > 0) {
            variables.add(value[0]);
          } else if (Array.isArray(value)) {
            value.forEach(extractVars);
          } else if (typeof value === 'object') {
            extractVars(value);
          }
        }
      }
    };
    
    extractVars(condition);
    return Array.from(variables);
  }
  
  /**
   * Create a test condition for validation
   */
  createTestCondition(condition, testData = {}) {
    try {
      const variables = this.extractVariables(condition);
      const mockData = {};
      
      // Create mock data for all variables
      variables.forEach(varName => {
        mockData[varName] = testData[varName] || null;
      });
      
      return {
        condition,
        variables,
        testData: mockData,
        result: this.evaluateRule(condition, mockData)
      };
    } catch (error) {
      return {
        condition,
        error: error.message
      };
    }
  }
}

module.exports = new EvaluatorService();
