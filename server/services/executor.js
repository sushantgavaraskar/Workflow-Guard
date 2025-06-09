const axios = require('axios');

async function executeActions(actions, data) {
  for (const action of actions) {
    if (action.type === 'webhook' && action.url) {
      try {
        await axios({
          method: action.method || 'POST',
          url: action.url,
          data
        });
        console.log(`Executed webhook for ${action.url}`);
      } catch (err) {
        console.error(`Failed to execute webhook: ${action.url}`, err.message);
      }
    }
  }
}

module.exports = { executeActions };
