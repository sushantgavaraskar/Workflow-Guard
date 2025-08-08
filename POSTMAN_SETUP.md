# Postman Collection Setup Guide

## 🚀 Quick Start

### 1. Import Collection and Environment

1. **Open Postman**
2. **Import Collection**: 
   - Click "Import" → Select `Workflow-Guard.postman_collection.json`
3. **Import Environment**: 
   - Click "Import" → Select `Workflow-Guard.postman_environment.json`
4. **Select Environment**: 
   - In the top-right dropdown, select "Workflow Guard Environment"

### 2. Start Your API Server

```bash
# Clone and setup
git clone https://github.com/sushantgavaraskar/Workflow-Guard.git
cd Workflow-Guard
npm install
npm run db:seed
npm run dev
```

### 3. Test the Collection

1. **Health Check**: Run "Health Check" to verify server is running
2. **Create Rules**: Run the rule creation requests
3. **Trigger Rules**: Execute the trigger requests
4. **View Logs**: Check the logs and statistics

## 📋 Collection Structure

### **Health & Status**
- ✅ **Health Check**: Verify API is running
- ✅ **Get Scheduler Status**: Check cron job status

### **Rules Management**
- ✅ **Get All Rules**: List all rules
- ✅ **Create Rule - High Value Transaction**: Create transaction alert rule
- ✅ **Create Rule - User Age Verification**: Create age verification rule
- ✅ **Create Rule - Scheduled Daily Report**: Create scheduled rule
- ✅ **Get Rule by ID**: Retrieve specific rule
- ✅ **Update Rule**: Modify existing rule
- ✅ **Delete Rule**: Remove rule
- ✅ **Bulk Import Rules**: Import multiple rules

### **Rule Execution**
- ✅ **Trigger Rules - High Value Transaction**: Test transaction rules
- ✅ **Trigger Rules - Age Verification**: Test age verification
- ✅ **Trigger Rules - Failed Login**: Test security rules
- ✅ **Trigger Rules - Low Stock**: Test inventory rules

### **Testing & Validation**
- ✅ **Test Condition Syntax**: Validate JSON Logic
- ✅ **Validate Action Configuration**: Check webhook config
- ✅ **Test Cron Expression**: Validate cron syntax
- ✅ **Get Rule Statistics**: View rule analytics

### **Logs & Monitoring**
- ✅ **Get Logs**: View execution logs
- ✅ **Get Log Statistics**: Analytics dashboard
- ✅ **Get Rule Logs**: Rule-specific logs
- ✅ **Export Logs - JSON**: Export as JSON
- ✅ **Export Logs - CSV**: Export as CSV
- ✅ **Clear Old Logs**: Cleanup old data

## 🔧 Environment Variables

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `baseUrl` | API base URL | `http://localhost:3000` |
| `webhookToken` | Webhook token for testing | `demo-token` |
| `ruleId` | Created rule ID (auto-set) | `""` |
| `ageRuleId` | Age rule ID (auto-set) | `""` |
| `scheduledRuleId` | Scheduled rule ID (auto-set) | `""` |
| `timestamp` | Current timestamp (auto-set) | `""` |
| `lastExecution` | Last execution results (auto-set) | `""` |

## 🎯 Demo Flow

### **Step 1: Health Check**
```bash
# Run: Health Check
# Expected: 200 OK with server status
```

### **Step 2: Create Sample Rules**
```bash
# Run: Create Rule - High Value Transaction
# Run: Create Rule - User Age Verification  
# Run: Create Rule - Scheduled Daily Report
# Run: Bulk Import Rules
# Expected: 201 Created for each rule
```

### **Step 3: Test Rule Execution**
```bash
# Run: Trigger Rules - High Value Transaction
# Expected: 200 OK with matched rules and execution results
```

### **Step 4: View Results**
```bash
# Run: Get Logs
# Run: Get Log Statistics
# Expected: 200 OK with execution logs and analytics
```

## 🔄 Automated Scripts

### **Pre-request Scripts**
- ✅ **Timestamp Generation**: Auto-sets current timestamp
- ✅ **Webhook Token**: Generates unique webhook tokens
- ✅ **Request Logging**: Logs request execution

### **Test Scripts**
- ✅ **Response Validation**: Validates API response structure
- ✅ **Status Code Check**: Ensures proper HTTP status codes
- ✅ **Rule ID Storage**: Auto-stores created rule IDs
- ✅ **Execution Logging**: Logs execution results

## 📊 Sample Data Examples

### **High Value Transaction Rule**
```json
{
  "name": "High Value Transaction Alert",
  "conditions": {
    "and": [
      { ">": [{ "var": "amount" }, 1000] },
      { "==": [{ "var": "currency" }, "USD"] }
    ]
  },
  "actions": [
    {
      "type": "webhook",
      "url": "https://webhook.site/demo-token",
      "method": "POST",
      "headers": {
        "Content-Type": "application/json",
        "X-Workflow-Guard": "high-value-alert"
      },
      "retries": 3,
      "timeout": 5000
    }
  ]
}
```

### **Age Verification Rule**
```json
{
  "name": "User Age Verification",
  "conditions": {
    ">=": [{ "var": "age" }, 18]
  },
  "actions": [
    {
      "type": "webhook",
      "url": "https://webhook.site/demo-token",
      "method": "POST",
      "headers": {
        "Content-Type": "application/json",
        "X-Workflow-Guard": "age-verification"
      }
    }
  ]
}
```

### **Scheduled Rule**
```json
{
  "name": "Scheduled Daily Report",
  "conditions": {
    "==": [1, 1]
  },
  "actions": [
    {
      "type": "webhook",
      "url": "https://webhook.site/demo-token",
      "method": "POST",
      "headers": {
        "Content-Type": "application/json",
        "X-Workflow-Guard": "daily-report"
      }
    }
  ],
  "schedule": "0 0 9 * * *"
}
```

## 🎯 Interview Demo Script

### **1. Setup (2 minutes)**
```bash
# Start server
npm run dev

# Import Postman collection
# Select environment
# Run Health Check
```

### **2. Create Rules (3 minutes)**
```bash
# Run: Create Rule - High Value Transaction
# Run: Create Rule - User Age Verification
# Run: Bulk Import Rules
# Show: Get All Rules
```

### **3. Execute Rules (3 minutes)**
```bash
# Run: Trigger Rules - High Value Transaction
# Run: Trigger Rules - Age Verification
# Run: Trigger Rules - Failed Login
# Show: Get Logs
```

### **4. Show Features (2 minutes)**
```bash
# Run: Test Condition Syntax
# Run: Get Log Statistics
# Run: Export Logs - JSON
# Show: Get Scheduler Status
```

## 🔧 Troubleshooting

### **Common Issues**

1. **Connection Refused**
   - Ensure server is running on port 3000
   - Check `baseUrl` environment variable

2. **404 Not Found**
   - Verify API routes are correct
   - Check server logs for errors

3. **500 Internal Server Error**
   - Check server console for error details
   - Verify database is initialized

4. **Rule ID Not Set**
   - Ensure rule creation requests succeed
   - Check test scripts are running

### **Debug Steps**

1. **Check Server Status**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Verify Database**
   ```bash
   npm run db:init
   npm run db:seed
   ```

3. **Check Environment**
   - Verify environment is selected
   - Check variable values

4. **Review Console**
   - Open browser dev tools
   - Check Postman console for errors

## 🚀 Production Setup

### **Update Environment Variables**
```json
{
  "baseUrl": "https://your-api-domain.com",
  "webhookToken": "your-production-webhook-token"
}
```

### **Add Authentication**
```json
{
  "Authorization": "Bearer your-api-token"
}
```

### **Custom Headers**
```json
{
  "X-API-Key": "your-api-key",
  "X-Client-ID": "your-client-id"
}
```

## 📈 Performance Testing

### **Load Testing Script**
```javascript
// Add to collection pre-request script
pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(1000);
});
```

### **Stress Testing**
1. Create multiple rules
2. Trigger rules simultaneously
3. Monitor response times
4. Check server logs

## 🎉 Success Indicators

### **✅ All Tests Pass**
- Health check returns 200
- Rule creation returns 201
- Rule execution returns 200
- Logs show execution results

### **✅ Features Working**
- JSON Logic evaluation
- Webhook execution
- Scheduled jobs
- Logging and monitoring
- Export functionality

### **✅ Performance Good**
- Response times < 1 second
- No memory leaks
- Stable under load
- Clean error handling

---

**Ready to demo! 🚀**

This collection provides a complete testing suite for your Workflow Guard API with realistic sample data, proper error handling, and automated workflows. 