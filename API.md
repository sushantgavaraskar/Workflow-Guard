# Workflow Guard API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
Currently, the API is open. For production use, implement authentication middleware.

## Response Format
All API responses follow this format:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

## Error Response Format
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "stack": "Stack trace (development only)"
  }
}
```

---

## Rules Management

### Create Rule
**POST** `/rules`

Creates a new workflow rule.

**Request Body:**
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
      "url": "https://api.example.com/notify",
      "method": "POST",
      "headers": {
        "Authorization": "Bearer token"
      },
      "retries": 3,
      "timeout": 5000
    }
  ],
  "schedule": "0 */5 * * * *"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "High Value Transaction Alert",
    "conditions": { ... },
    "actions": [ ... ],
    "schedule": "0 */5 * * * *",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Rule created successfully"
}
```

### Get All Rules
**GET** `/rules`

**Query Parameters:**
- `isActive` (boolean): Filter by active status
- `hasSchedule` (boolean): Filter by scheduled rules

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Rule Name",
      "conditions": { ... },
      "actions": [ ... ],
      "schedule": "0 */5 * * * *",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

### Get Rule by ID
**GET** `/rules/{id}`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Rule Name",
    "conditions": { ... },
    "actions": [ ... ],
    "schedule": "0 */5 * * * *",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Update Rule
**PUT** `/rules/{id}`

**Request Body:** (Partial updates supported)
```json
{
  "name": "Updated Rule Name",
  "isActive": false
}
```

### Delete Rule
**DELETE** `/rules/{id}`

**Response:**
```json
{
  "success": true,
  "message": "Rule deleted successfully"
}
```

### Bulk Import Rules
**POST** `/rules/bulk`

**Request Body:**
```json
[
  {
    "name": "Rule 1",
    "conditions": { ... },
    "actions": [ ... ]
  },
  {
    "name": "Rule 2",
    "conditions": { ... },
    "actions": [ ... ]
  }
]
```

---

## Rule Execution

### Trigger Rules
**POST** `/trigger`

Evaluates all active rules against the provided data.

**Request Body:**
```json
{
  "event": "transaction.created",
  "data": {
    "amount": 1500,
    "currency": "USD",
    "userId": "12345"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "event": "transaction.created",
    "matchedRules": [
      {
        "id": "uuid",
        "name": "High Value Transaction Alert"
      }
    ],
    "totalRules": 5,
    "executionResults": [
      {
        "ruleId": "uuid",
        "ruleName": "High Value Transaction Alert",
        "actions": [
          {
            "success": true,
            "action": { ... },
            "response": {
              "status": 200,
              "statusText": "OK",
              "data": { ... }
            },
            "executionTime": 150,
            "attempt": 1
          }
        ]
      }
    ],
    "message": "Processed 5 rules, 1 matched"
  }
}
```

---

## Testing & Validation

### Test Condition Syntax
**POST** `/rules/test-condition`

**Request Body:**
```json
{
  "condition": {
    "and": [
      { ">": [{ "var": "amount" }, 1000] },
      { "==": [{ "var": "currency" }, "USD"] }
    ]
  },
  "testData": {
    "amount": 1500,
    "currency": "USD"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "testResult": {
      "condition": { ... },
      "variables": ["amount", "currency"],
      "testData": { ... },
      "result": true
    }
  }
}
```

### Validate Action Configuration
**POST** `/rules/validate-action`

**Request Body:**
```json
{
  "action": {
    "type": "webhook",
    "url": "https://api.example.com/notify",
    "method": "POST"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "errors": []
  }
}
```

### Test Cron Expression
**POST** `/rules/test-cron`

**Request Body:**
```json
{
  "expression": "0 */5 * * * *"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "nextExecutions": [
      "2024-01-01T00:05:00.000Z",
      "2024-01-01T00:10:00.000Z",
      "2024-01-01T00:15:00.000Z",
      "2024-01-01T00:20:00.000Z",
      "2024-01-01T00:25:00.000Z"
    ]
  }
}
```

---

## Logs & Monitoring

### Get Logs
**GET** `/logs`

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `sortBy` (string): Sort field (executedAt, ruleId, matched)
- `sortOrder` (string): Sort direction (asc, desc)
- `ruleId` (string): Filter by rule ID
- `matched` (boolean): Filter by match status
- `startDate` (string): Filter by start date
- `endDate` (string): Filter by end date

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "ruleId": "uuid",
        "matched": true,
        "executedAt": "2024-01-01T00:00:00.000Z",
        "input": { ... },
        "executionTime": 150,
        "error": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Get Log Statistics
**GET** `/logs/stats`

**Query Parameters:**
- `startDate` (string): Start date for statistics
- `endDate` (string): End date for statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 1000,
    "matched": 750,
    "unmatched": 250,
    "topRules": [
      {
        "ruleId": "uuid",
        "count": 100,
        "matched_count": 75
      }
    ],
    "recentActivity": [
      {
        "executedAt": "2024-01-01",
        "count": 50
      }
    ]
  }
}
```

### Get Rule Logs
**GET** `/rules/{ruleId}/logs`

**Query Parameters:**
- `limit` (number): Items per page (default: 50, max: 100)

### Export Logs
**GET** `/logs/export`

**Query Parameters:**
- `format` (string): Export format (json, csv)
- `startDate` (string): Start date
- `endDate` (string): End date

### Clear Old Logs
**DELETE** `/logs`

**Request Body:**
```json
{
  "days": 30
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deletedCount": 500,
    "cutoffDate": "2023-12-01T00:00:00.000Z",
    "message": "Cleared 500 logs older than 30 days"
  }
}
```

---

## Health & Status

### Health Check
**GET** `/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "services": {
    "database": "healthy",
    "scheduler": "healthy"
  }
}
```

### Get Scheduler Status
**GET** `/scheduler/status`

**Response:**
```json
{
  "success": true,
  "data": {
    "running": true,
    "jobCount": 3,
    "jobs": [
      {
        "ruleId": "uuid",
        "running": true,
        "nextDate": "2024-01-01T00:05:00.000Z"
      }
    ]
  }
}
```

---

## JSON Logic Examples

### Basic Comparisons
```json
{ "==": [{ "var": "status" }, "approved"] }
{ ">": [{ "var": "amount" }, 1000] }
{ ">=": [{ "var": "age" }, 18] }
{ "<": [{ "var": "stock" }, 10] }
{ "!=": [{ "var": "type" }, "admin"] }
```

### Logical Operators
```json
{
  "and": [
    { ">": [{ "var": "amount" }, 1000] },
    { "==": [{ "var": "currency" }, "USD"] }
  ]
}
```

```json
{
  "or": [
    { "==": [{ "var": "status" }, "pending"] },
    { "==": [{ "var": "status" }, "approved"] }
  ]
}
```

```json
{
  "not": { "==": [{ "var": "status" }, "rejected"] }
}
```

### Array Operations
```json
{
  "in": [{ "var": "category" }, ["electronics", "books"]]
}
```

```json
{
  "some": [
    { "var": "items" },
    { ">": [{ "var": "price" }, 100] }
  ]
}
```

### String Operations
```json
{
  "cat": [
    { "var": "firstName" },
    " ",
    { "var": "lastName" }
  ]
}
```

### Complex Conditions
```json
{
  "and": [
    { ">": [{ "var": "order.total" }, 500] },
    { "in": [{ "var": "order.status" }, ["pending", "confirmed"]] },
    {
      "or": [
        { "==": [{ "var": "customer.tier" }, "premium"] },
        { ">": [{ "var": "customer.purchaseCount" }, 10] }
      ]
    }
  ]
}
```

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Rate Limiting

- **Window**: 15 minutes
- **Limit**: 100 requests per IP
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## CORS

The API supports CORS with configurable origins. Default allows all origins (`*`).

---

## Webhook Actions

### Supported HTTP Methods
- GET, POST, PUT, PATCH, DELETE

### Retry Logic
- Configurable retry attempts (default: 3)
- Exponential backoff
- No retry on 4xx errors (except 429)

### Timeout
- Configurable timeout (default: 10 seconds)
- Per-action timeout override

### Headers
- Automatic Content-Type: application/json
- Custom headers support
- Workflow metadata headers 