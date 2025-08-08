# Workflow Guard - Enterprise-Grade Automation API

**Workflow Guard** is a production-ready, scalable automation API that enables you to define, evaluate, and execute conditional workflows using JSON-based rules. Built with enterprise-grade architecture, it provides a robust REST API for automation logic with full control over your data and processes.

## 🚀 Key Features

- **JSON Logic Engine**: Define complex business rules using JSON Logic syntax
- **Webhook Actions**: Execute HTTP requests with retry logic and error handling
- **Scheduled Execution**: Run rules on cron schedules with timezone support
- **Real-time Logging**: Comprehensive logging with Winston and structured data
- **RESTful API**: Full-featured API with validation, rate limiting, and security
- **Production Ready**: Docker support, health checks, graceful shutdown
- **Enterprise Security**: CORS, rate limiting, input validation, security headers

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Clients   │    │   Express API   │    │   SQLite DB     │
│   (Any Client)  │◄──►│   (Port 3000)   │◄──►│   (Data Layer)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Scheduler     │
                       │   (Cron Jobs)   │
                       └─────────────────┘
```

## 🛠️ Tech Stack

### Backend
- **Node.js 18+** - Runtime environment
- **Express.js** - Web framework
- **SQLite3** - Database (with WAL mode and indexing)
- **Winston** - Structured logging
- **Joi** - Input validation
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **node-cron** - Scheduled job execution

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm 8+

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/sushantgavaraskar/Workflow-Guard.git
   cd Workflow-Guard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Initialize database**
   ```bash
   npm run db:init
   ```

5. **Seed with sample data (optional)**
   ```bash
   npm run db:seed
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t workflow-guard .
docker run -p 3000:3000 workflow-guard
```

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `DB_PATH` | `./data/workflow.db` | Database file path |
| `CORS_ORIGIN` | `*` | Allowed CORS origin |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |
| `LOG_LEVEL` | `info` | Logging level |
| `WEBHOOK_TIMEOUT_MS` | `10000` | Webhook timeout |
| `CRON_ENABLED` | `true` | Enable scheduled jobs |
| `API_VERSION` | `v1` | API version |
| `API_PREFIX` | `/api` | API route prefix |

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication
Currently, the API is open. For production, implement authentication middleware.

### Endpoints

#### Rules Management

**Create Rule**
```http
POST /rules
Content-Type: application/json

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
      }
    }
  ],
  "schedule": "0 */5 * * * *"  // Optional cron schedule
}
```

**Get Rules**
```http
GET /rules?isActive=true&hasSchedule=true
```

**Update Rule**
```http
PUT /rules/{id}
Content-Type: application/json

{
  "name": "Updated Rule Name",
  "isActive": false
}
```

**Delete Rule**
```http
DELETE /rules/{id}
```

#### Rule Execution

**Trigger Rules**
```http
POST /trigger
Content-Type: application/json

{
  "event": "transaction.created",
  "data": {
    "amount": 1500,
    "currency": "USD",
    "userId": "12345"
  }
}
```

#### Logs & Monitoring

**Get Logs**
```http
GET /logs?page=1&limit=20&sortBy=executedAt&sortOrder=desc
```

**Get Statistics**
```http
GET /logs/stats?startDate=2024-01-01&endDate=2024-01-31
```

**Export Logs**
```http
GET /logs/export?format=csv&startDate=2024-01-01
```

#### Health & Status

**Health Check**
```http
GET /health
```

**Scheduler Status**
```http
GET /scheduler/status
```

## 🎯 Usage Examples

### Example 1: E-commerce Order Processing

```json
{
  "name": "Large Order Notification",
  "conditions": {
    "and": [
      { ">": [{ "var": "order.total" }, 500] },
      { "in": [{ "var": "order.status" }, ["pending", "confirmed"]] }
    ]
  },
  "actions": [
    {
      "type": "webhook",
      "url": "https://slack.com/api/chat.postMessage",
      "method": "POST",
      "headers": {
        "Authorization": "Bearer xoxb-your-token",
        "Content-Type": "application/json"
      },
      "transform": {
        "channel": "#orders",
        "text": "Large order received: ${{order.total}} from ${{order.customer.name}}"
      }
    }
  ]
}
```

### Example 2: User Registration Validation

```json
{
  "name": "Age Verification",
  "conditions": {
    "and": [
      { ">=": [{ "var": "user.age" }, 18] },
      { "==": [{ "var": "user.country" }, "US"] }
    ]
  },
  "actions": [
    {
      "type": "webhook",
      "url": "https://api.example.com/verify-age",
      "method": "POST",
      "retries": 3,
      "timeout": 5000
    }
  ]
}
```

### Example 3: Scheduled Maintenance Alert

```json
{
  "name": "Daily System Check",
  "conditions": {
    "==": [1, 1]  // Always true for scheduled rules
  },
  "actions": [
    {
      "type": "webhook",
      "url": "https://api.example.com/system-health",
      "method": "GET"
    }
  ],
  "schedule": "0 0 9 * * *"  // Daily at 9 AM
}
```

## 🔒 Security Features

- **Input Validation**: Joi schema validation for all inputs
- **Rate Limiting**: Configurable rate limiting per IP
- **CORS Protection**: Configurable cross-origin policies
- **Security Headers**: Helmet.js for security headers
- **Input Sanitization**: XSS protection
- **SQL Injection Protection**: Parameterized queries
- **Error Handling**: No sensitive data leakage in production

## 📊 Monitoring & Logging

### Log Levels
- `error` - Application errors
- `warn` - Warning conditions
- `info` - General information
- `debug` - Debug information

### Log Files
- `logs/app.log` - All application logs
- `logs/error.log` - Error logs only

### Metrics Available
- Rule execution statistics
- Webhook success/failure rates
- Response times
- Error rates
- Scheduler job status

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins
- [ ] Set up SSL/TLS certificates
- [ ] Configure database backups
- [ ] Set up monitoring and alerting
- [ ] Configure log rotation
- [ ] Set up reverse proxy (nginx)
- [ ] Configure environment variables

### Deployment Options

**Docker (Recommended)**
```bash
docker-compose -f docker-compose.yml up -d
```

**Railway**
```bash
railway up
```

**Vercel**
```bash
vercel --prod
```

**Heroku**
```bash
heroku create
git push heroku main
```

**AWS Lambda**
```bash
# Package and deploy as Lambda function
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

## 📈 Performance

- **Database**: SQLite with WAL mode and optimized indexes
- **Caching**: In-memory rule caching for evaluation
- **Connection Pooling**: Optimized database connections
- **Async Processing**: Non-blocking webhook execution
- **Rate Limiting**: Prevents abuse and ensures stability

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/sushantgavaraskar/Workflow-Guard/issues)
- **Documentation**: [Wiki](https://github.com/sushantgavaraskar/Workflow-Guard/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/sushantgavaraskar/Workflow-Guard/discussions)

## 🔄 Changelog

### v1.0.0 (Current)
- ✅ Enterprise-grade architecture
- ✅ Comprehensive error handling
- ✅ Security middleware
- ✅ Structured logging
- ✅ Docker support
- ✅ Health checks
- ✅ API validation
- ✅ Rate limiting
- ✅ Graceful shutdown
- ✅ Production-ready configuration
- ✅ Backend-only API service

---

**Built with ❤️ for developers who need reliable automation APIs**






