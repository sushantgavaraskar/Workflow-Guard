const { v4: uuidv4 } = require('uuid');
const { query, queryOne, run, transaction } = require('../models/db');
const { logger, logRuleOperation } = require('../utils/logger');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Rule Service - Handles all rule-related business logic
 */
class RuleService {
  /**
   * Create a new rule
   */
  async createRule(ruleData) {
    const { name, conditions, actions, schedule } = ruleData;
    
    try {
      // Check if rule name already exists
      const existingRule = await queryOne(
        'SELECT id FROM rules WHERE name = ?',
        [name]
      );
      
      if (existingRule) {
        throw new ApiError(409, `Rule with name '${name}' already exists`);
      }
      
      const ruleId = uuidv4();
      const now = new Date().toISOString();
      
      await run(
        `INSERT INTO rules (id, name, conditions, actions, schedule, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          ruleId,
          name,
          JSON.stringify(conditions),
          JSON.stringify(actions),
          schedule || null,
          now,
          now
        ]
      );
      
      logRuleOperation('created', ruleId, name);
      
      return {
        id: ruleId,
        name,
        conditions,
        actions,
        schedule,
        isActive: true,
        createdAt: now,
        updatedAt: now
      };
    } catch (error) {
      logger.error('Failed to create rule', {
        error: error.message,
        ruleData: { name, schedule }
      });
      throw error;
    }
  }
  
  /**
   * Get all rules with optional filtering
   */
  async getRules(filters = {}) {
    try {
      let sql = 'SELECT * FROM rules WHERE 1=1';
      const params = [];
      
      if (filters.isActive !== undefined) {
        sql += ' AND isActive = ?';
        params.push(filters.isActive ? 1 : 0);
      }
      
      if (filters.hasSchedule !== undefined) {
        if (filters.hasSchedule) {
          sql += ' AND schedule IS NOT NULL';
        } else {
          sql += ' AND schedule IS NULL';
        }
      }
      
      sql += ' ORDER BY createdAt DESC';
      
      const rules = await query(sql, params);
      
      return rules.map(rule => ({
        ...rule,
        conditions: JSON.parse(rule.conditions),
        actions: JSON.parse(rule.actions),
        isActive: Boolean(rule.isActive)
      }));
    } catch (error) {
      logger.error('Failed to get rules', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Get a single rule by ID
   */
  async getRuleById(ruleId) {
    try {
      const rule = await queryOne(
        'SELECT * FROM rules WHERE id = ?',
        [ruleId]
      );
      
      if (!rule) {
        throw new ApiError(404, `Rule with ID '${ruleId}' not found`);
      }
      
      return {
        ...rule,
        conditions: JSON.parse(rule.conditions),
        actions: JSON.parse(rule.actions),
        isActive: Boolean(rule.isActive)
      };
    } catch (error) {
      logger.error('Failed to get rule by ID', {
        error: error.message,
        ruleId
      });
      throw error;
    }
  }
  
  /**
   * Update a rule
   */
  async updateRule(ruleId, updateData) {
    try {
      const existingRule = await this.getRuleById(ruleId);
      
      // Check if new name conflicts with existing rules
      if (updateData.name && updateData.name !== existingRule.name) {
        const nameConflict = await queryOne(
          'SELECT id FROM rules WHERE name = ? AND id != ?',
          [updateData.name, ruleId]
        );
        
        if (nameConflict) {
          throw new ApiError(409, `Rule with name '${updateData.name}' already exists`);
        }
      }
      
      const updateFields = [];
      const params = [];
      
      if (updateData.name !== undefined) {
        updateFields.push('name = ?');
        params.push(updateData.name);
      }
      
      if (updateData.conditions !== undefined) {
        updateFields.push('conditions = ?');
        params.push(JSON.stringify(updateData.conditions));
      }
      
      if (updateData.actions !== undefined) {
        updateFields.push('actions = ?');
        params.push(JSON.stringify(updateData.actions));
      }
      
      if (updateData.schedule !== undefined) {
        updateFields.push('schedule = ?');
        params.push(updateData.schedule);
      }
      
      if (updateData.isActive !== undefined) {
        updateFields.push('isActive = ?');
        params.push(updateData.isActive ? 1 : 0);
      }
      
      if (updateFields.length === 0) {
        throw new ApiError(400, 'No valid fields to update');
      }
      
      updateFields.push('updatedAt = ?');
      params.push(new Date().toISOString());
      params.push(ruleId);
      
      await run(
        `UPDATE rules SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );
      
      logRuleOperation('updated', ruleId, updateData.name || existingRule.name);
      
      return await this.getRuleById(ruleId);
    } catch (error) {
      logger.error('Failed to update rule', {
        error: error.message,
        ruleId,
        updateData
      });
      throw error;
    }
  }
  
  /**
   * Delete a rule
   */
  async deleteRule(ruleId) {
    try {
      const rule = await this.getRuleById(ruleId);
      
      await run('DELETE FROM rules WHERE id = ?', [ruleId]);
      
      logRuleOperation('deleted', ruleId, rule.name);
      
      return { message: 'Rule deleted successfully' };
    } catch (error) {
      logger.error('Failed to delete rule', {
        error: error.message,
        ruleId
      });
      throw error;
    }
  }
  
  /**
   * Bulk import rules
   */
  async bulkImportRules(rules) {
    try {
      const results = await transaction(async () => {
        const importedRules = [];
        
        for (const ruleData of rules) {
          const rule = await this.createRule(ruleData);
          importedRules.push(rule);
        }
        
        return importedRules;
      });
      
      logger.info('Bulk rule import completed', {
        count: results.length
      });
      
      return {
        message: `Successfully imported ${results.length} rules`,
        rules: results
      };
    } catch (error) {
      logger.error('Bulk rule import failed', {
        error: error.message,
        ruleCount: rules.length
      });
      throw error;
    }
  }
  
  /**
   * Get active rules for evaluation
   */
  async getActiveRules() {
    try {
      const rules = await query(
        'SELECT * FROM rules WHERE isActive = 1'
      );
      
      return rules.map(rule => ({
        ...rule,
        conditions: JSON.parse(rule.conditions),
        actions: JSON.parse(rule.actions),
        isActive: Boolean(rule.isActive)
      }));
    } catch (error) {
      logger.error('Failed to get active rules', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Get scheduled rules
   */
  async getScheduledRules() {
    try {
      const rules = await query(
        'SELECT * FROM rules WHERE isActive = 1 AND schedule IS NOT NULL'
      );
      
      return rules.map(rule => ({
        ...rule,
        conditions: JSON.parse(rule.conditions),
        actions: JSON.parse(rule.actions),
        isActive: Boolean(rule.isActive)
      }));
    } catch (error) {
      logger.error('Failed to get scheduled rules', { error: error.message });
      throw error;
    }
  }
}

module.exports = new RuleService(); 