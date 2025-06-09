const jsonLogic = require('json-logic-js');

function evaluateRule(condition, data) {
  try {
    return jsonLogic.apply(condition, data);
  } catch (err) {
    console.error('Error evaluating condition:', err);
    return false;
  }
}

module.exports = { evaluateRule };
