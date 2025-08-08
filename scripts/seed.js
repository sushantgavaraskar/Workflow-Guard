const { initDB } = require('../server/models/db');
const ruleService = require('../server/services/ruleService');
const { logger } = require('../server/utils/logger');

const sampleRules = [
  {
    name: "High Value Transaction Alert",
    conditions: {
      "and": [
        { ">": [{ "var": "amount" }, 1000] },
        { "==": [{ "var": "currency" }, "USD"] }
      ]
    },
    actions: [
      {
        "type": "webhook",
        "url": "https://webhook.site/your-highvalue-url",
        "method": "POST",
        "headers": {
          "Content-Type": "application/json"
        }
      }
    ],
    schedule: null
  },
  {
    name: "User Age Verification",
    conditions: {
      ">=": [{ "var": "age" }, 18]
    },
    actions: [
      {
        "type": "webhook",
        "url": "https://webhook.site/your-agecheck-url",
        "method": "POST"
      }
    ],
    schedule: null
  },
  {
    name: "Scheduled Daily Report",
    conditions: {
      "==": [1, 1]  // Always true for scheduled rules
    },
    actions: [
      {
        "type": "webhook",
        "url": "https://webhook.site/your-scheduled-url",
        "method": "POST"
      }
    ],
    schedule: "0 0 9 * * *"  // Daily at 9 AM
  },
  {
    name: "Failed Login Alert",
    conditions: {
      "and": [
        { "==": [{ "var": "event" }, "login.failed"] },
        { ">": [{ "var": "attempts" }, 3] }
      ]
    },
    actions: [
      {
        "type": "webhook",
        "url": "https://webhook.site/your-security-url",
        "method": "POST",
        "headers": {
          "X-Security-Level": "high"
        }
      }
    ],
    schedule: null
  },
  {
    name: "Inventory Low Stock",
    conditions: {
      "<": [{ "var": "stock" }, 10]
    },
    actions: [
      {
        "type": "webhook",
        "url": "https://webhook.site/your-inventory-url",
        "method": "POST",
        "retries": 3,
        "timeout": 5000
      }
    ],
    schedule: null
  }
];

async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');
    
    // Initialize database
    await initDB();
    logger.info('Database initialized');
    
    // Import sample rules
    const result = await ruleService.bulkImportRules(sampleRules);
    
    logger.info('Database seeding completed successfully', {
      importedRules: result.rules.length,
      message: result.message
    });
    
    console.log('✅ Database seeded successfully!');
    console.log(`📊 Imported ${result.rules.length} sample rules`);
    console.log('🚀 You can now start the application with: npm run dev:full');
    
    process.exit(0);
  } catch (error) {
    logger.error('Database seeding failed', {
      error: error.message,
      stack: error.stack
    });
    
    console.error('❌ Database seeding failed:', error.message);
    process.exit(1);
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase }; 