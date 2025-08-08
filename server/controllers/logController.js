const { query } = require('../models/db');
const { logger } = require('../utils/logger');

/**
 * Log Controller - Handles HTTP requests for log management
 */
class LogController {
  /**
   * Get workflow logs with pagination and filtering
   */
  async getLogs(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'executedAt',
        sortOrder = 'desc',
        ruleId,
        matched,
        startDate,
        endDate
      } = req.query;
      
      // Validate pagination parameters
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;
      
      // Build query
      let sql = 'SELECT * FROM workflow_logs WHERE 1=1';
      const params = [];
      
      // Add filters
      if (ruleId) {
        sql += ' AND ruleId = ?';
        params.push(ruleId);
      }
      
      if (matched !== undefined) {
        sql += ' AND matched = ?';
        params.push(matched === 'true' ? 1 : 0);
      }
      
      if (startDate) {
        sql += ' AND executedAt >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        sql += ' AND executedAt <= ?';
        params.push(endDate);
      }
      
      // Add sorting
      const validSortFields = ['executedAt', 'ruleId', 'matched'];
      const validSortOrders = ['asc', 'desc'];
      
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'executedAt';
      const sortDirection = validSortOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'DESC';
      
      sql += ` ORDER BY ${sortField} ${sortDirection}`;
      
      // Add pagination
      sql += ' LIMIT ? OFFSET ?';
      params.push(limitNum, offset);
      
      // Execute query
      const logs = await query(sql, params);
      
      // Get total count for pagination
      const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total').replace(/LIMIT \? OFFSET \?$/, '');
      const countParams = params.slice(0, -2);
      const countResult = await query(countSql, countParams);
      const total = countResult[0]?.total || 0;
      
      // Parse JSON fields
      const parsedLogs = logs.map(log => ({
        ...log,
        input: log.input ? JSON.parse(log.input) : null,
        matched: Boolean(log.matched)
      }));
      
      res.json({
        success: true,
        data: {
          logs: parsedLogs,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
            hasNext: pageNum * limitNum < total,
            hasPrev: pageNum > 1
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get log statistics
   */
  async getLogStats(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      
      let whereClause = 'WHERE 1=1';
      const params = [];
      
      if (startDate) {
        whereClause += ' AND executedAt >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        whereClause += ' AND executedAt <= ?';
        params.push(endDate);
      }
      
      // Get total logs
      const totalResult = await query(
        `SELECT COUNT(*) as total FROM workflow_logs ${whereClause}`,
        params
      );
      
      // Get matched vs unmatched counts
      const matchedResult = await query(
        `SELECT matched, COUNT(*) as count FROM workflow_logs ${whereClause} GROUP BY matched`,
        params
      );
      
      // Get logs by rule
      const ruleStatsResult = await query(
        `SELECT ruleId, COUNT(*) as count, SUM(CASE WHEN matched = 1 THEN 1 ELSE 0 END) as matched_count 
         FROM workflow_logs ${whereClause} GROUP BY ruleId ORDER BY count DESC LIMIT 10`,
        params
      );
      
      // Get recent activity
      const recentActivityResult = await query(
        `SELECT executedAt, COUNT(*) as count FROM workflow_logs ${whereClause} 
         GROUP BY DATE(executedAt) ORDER BY executedAt DESC LIMIT 7`,
        params
      );
      
      const stats = {
        total: totalResult[0]?.total || 0,
        matched: 0,
        unmatched: 0,
        topRules: ruleStatsResult,
        recentActivity: recentActivityResult
      };
      
      // Calculate matched/unmatched from grouped results
      matchedResult.forEach(row => {
        if (row.matched) {
          stats.matched = row.count;
        } else {
          stats.unmatched = row.count;
        }
      });
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get logs for a specific rule
   */
  async getRuleLogs(req, res, next) {
    try {
      const { ruleId } = req.params;
      const { limit = 50 } = req.query;
      
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      
      const logs = await query(
        `SELECT * FROM workflow_logs WHERE ruleId = ? ORDER BY executedAt DESC LIMIT ?`,
        [ruleId, limitNum]
      );
      
      const parsedLogs = logs.map(log => ({
        ...log,
        input: log.input ? JSON.parse(log.input) : null,
        matched: Boolean(log.matched)
      }));
      
      res.json({
        success: true,
        data: {
          ruleId,
          logs: parsedLogs,
          count: parsedLogs.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Clear old logs
   */
  async clearOldLogs(req, res, next) {
    try {
      const { days = 30 } = req.body;
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
      
      const result = await query(
        'DELETE FROM workflow_logs WHERE executedAt < ?',
        [cutoffDate.toISOString()]
      );
      
      logger.info('Cleared old logs', {
        days,
        cutoffDate: cutoffDate.toISOString(),
        deletedCount: result.changes
      });
      
      res.json({
        success: true,
        data: {
          deletedCount: result.changes,
          cutoffDate: cutoffDate.toISOString(),
          message: `Cleared ${result.changes} logs older than ${days} days`
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Export logs
   */
  async exportLogs(req, res, next) {
    try {
      const { format = 'json', startDate, endDate } = req.query;
      
      let sql = 'SELECT * FROM workflow_logs WHERE 1=1';
      const params = [];
      
      if (startDate) {
        sql += ' AND executedAt >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        sql += ' AND executedAt <= ?';
        params.push(endDate);
      }
      
      sql += ' ORDER BY executedAt DESC';
      
      const logs = await query(sql, params);
      
      const parsedLogs = logs.map(log => ({
        ...log,
        input: log.input ? JSON.parse(log.input) : null,
        matched: Boolean(log.matched)
      }));
      
      if (format === 'csv') {
        // Convert to CSV format
        const csv = this.convertToCSV(parsedLogs);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=workflow-logs.csv');
        res.send(csv);
      } else {
        // Return JSON
        res.json({
          success: true,
          data: {
            logs: parsedLogs,
            count: parsedLogs.length,
            exportDate: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Convert logs to CSV format
   */
  convertToCSV(logs) {
    if (logs.length === 0) {
      return 'id,ruleId,matched,executedAt,input,executionTime,error\n';
    }
    
    const headers = Object.keys(logs[0]).join(',');
    const rows = logs.map(log => {
      return [
        log.id,
        log.ruleId,
        log.matched ? 'true' : 'false',
        log.executedAt,
        log.input ? JSON.stringify(log.input).replace(/"/g, '""') : '',
        log.executionTime || '',
        log.error || ''
      ].join(',');
    });
    
    return [headers, ...rows].join('\n');
  }
}

module.exports = new LogController(); 