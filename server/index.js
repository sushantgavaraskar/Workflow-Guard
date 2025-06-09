const express = require('express');
const app = express();
const workflowRoutes = require('./routes/workflow');
const { startScheduledJobs } = require('../cron/ruleRunner');

app.use(express.json());
app.use('/api', workflowRoutes);

// Start scheduler
startScheduledJobs();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Workflow Guard server running on port ${PORT}`);
});
