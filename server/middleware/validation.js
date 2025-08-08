const Joi = require('joi');
const { ApiError } = require('./errorHandler');

/**
 * Generic validation middleware
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return next(new ApiError(400, `Validation Error: ${errorMessage}`));
    }
    
    next();
  };
};

/**
 * Validation schemas for different endpoints
 */
const schemas = {
  // Rule creation schema
  createRule: Joi.object({
    name: Joi.string().required().min(1).max(100).messages({
      'string.empty': 'Rule name is required',
      'string.max': 'Rule name cannot exceed 100 characters'
    }),
    conditions: Joi.object().required().messages({
      'object.base': 'Conditions must be a valid JSON object'
    }),
    actions: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('webhook').required(),
        url: Joi.string().uri().required(),
        method: Joi.string().valid('GET', 'POST', 'PUT', 'PATCH', 'DELETE').default('POST'),
        headers: Joi.object().optional(),
        timeout: Joi.number().integer().min(1000).max(30000).optional()
      })
    ).min(1).required().messages({
      'array.min': 'At least one action is required',
      'array.base': 'Actions must be an array'
    }),
    schedule: Joi.string().allow(null, '').optional()
  }),

  // Bulk rule import schema
  bulkRules: Joi.array().items(
    Joi.object({
      name: Joi.string().required().min(1).max(100),
      conditions: Joi.object().required(),
      actions: Joi.array().items(
        Joi.object({
          type: Joi.string().valid('webhook').required(),
          url: Joi.string().uri().required(),
          method: Joi.string().valid('GET', 'POST', 'PUT', 'PATCH', 'DELETE').default('POST'),
          headers: Joi.object().optional(),
          timeout: Joi.number().integer().min(1000).max(30000).optional()
        })
      ).min(1).required(),
      schedule: Joi.string().allow(null, '').optional()
    })
  ).min(1).max(100).messages({
    'array.min': 'At least one rule is required',
    'array.max': 'Cannot import more than 100 rules at once'
  }),

  // Trigger evaluation schema
  trigger: Joi.object({
    event: Joi.string().required().min(1).max(100).messages({
      'string.empty': 'Event name is required',
      'string.max': 'Event name cannot exceed 100 characters'
    }),
    data: Joi.object().required().messages({
      'object.base': 'Data must be a valid JSON object'
    })
  }),

  // Pagination schema for logs
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('executedAt', 'ruleId', 'matched').default('executedAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

module.exports = {
  validate,
  schemas
}; 