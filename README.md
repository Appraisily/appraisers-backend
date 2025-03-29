# Appraisers Backend Service

A robust Node.js backend service for managing art appraisals, providing secure API endpoints for authentication, appraisal management, and integration with various services. Now featuring real-time updates via secure WebSockets.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run in production mode
npm start

# Run linting
npm run lint

# Run tests
npm test

# Run a single test
npx jest path/to/test.js -t "test name"

# Debug tests
NODE_ENV=test node --inspect-brk node_modules/.bin/jest --runInBand
```

## 🏗️ Project Structure

```
src/
├── config/               # Configuration files
│   ├── corsConfig.js     # CORS configuration
│   ├── development.config.js
│   └── index.js          # Main config
├── constants/            # Application constants
│   ├── authorizedUsers.js
│   └── routes.js
├── controllers/          # Request handlers
│   ├── appraisal/
│   ├── auth/
│   └── health.controller.js
├── middleware/           # Express middleware
│   ├── authenticate.js
│   ├── errorHandler.js
│   ├── routeValidator.js
│   └── validateService.js
├── routes/               # API routes
│   ├── appraisal.routes.js
│   ├── auth.routes.js
│   ├── health.routes.js
│   ├── index.js
│   └── updatePending.routes.js
├── services/             # Business logic and external services
│   ├── ai.service.js
│   ├── email.service.js
│   ├── pubsub.service.js
│   ├── sheets.service.js
│   ├── websocket.service.js  # Real-time updates via WebSockets
│   └── wordpress.service.js
├── tests/                # Test files
│   └── routes.test.js
├── utils/                # Utility functions
│   ├── getImageUrl.js
│   ├── secretManager.js
│   └── validators.js
├── app.js                # Express app setup
├── index.js              # Application entry point
└── worker.js             # Background worker process
```

## ✨ Features

### Authentication
- JWT-based authentication with HTTP-only cookies
- Secure token refresh mechanism
- Role-based access control
- Backend-to-backend authentication using shared secrets

### Real-Time Updates
- WebSocket server for live status updates
- Secure WSS connections for HTTPS clients
- Automatic protocol detection
- Connection status monitoring
- Broadcast system for appraisal status changes

### Appraisal Management
- List pending and completed appraisals
- Detailed appraisal information retrieval
- Value setting and updating
- Automated appraisal processing pipeline
- PDF generation and document management
- Email notifications with customizable delays

### Service Integrations
- WordPress CMS integration for content management
- Google Sheets for data storage
- SendGrid for email communications
- Google Cloud PubSub for async processing
- Google Secret Manager for secure configuration
- OpenAI for AI-powered descriptions

## 🔌 API Endpoints

### Authentication
```
POST /api/auth/login         - User login
POST /api/auth/refresh       - Refresh token
POST /api/auth/logout        - User logout
POST /api/auth/google        - Google authentication
```

### Appraisals
```
GET  /api/appraisals              - List pending appraisals
GET  /api/appraisals/completed    - List completed appraisals
GET  /api/appraisals/:id/list     - Get appraisal details
GET  /api/appraisals/:id/list-edit - Get appraisal details for editing
POST /api/appraisals/:id/set-value - Set appraisal value
POST /api/appraisals/:id/complete-process - Start appraisal processing
GET  /api/appraisals/get-session-id - Get a new session ID
POST /api/appraisals/:id/save-links - Save related links
POST /api/appraisals/:id/update-links - Update related links
POST /api/appraisals/:id/update-acf-field - Update ACF fields
```

### Update Pending Appraisal
```
POST /api/update-pending-appraisal - Update pending appraisal with new data
```

### Health Checks
```
GET  /api/health/status    - Service health status
GET  /api/health/endpoints - List available endpoints
```

## 🔐 WebSocket Security

The project implements secure WebSocket connections:

- Automatic protocol detection (WSS for HTTPS, WS for HTTP)
- Secure connection handling in production environments
- Connection status monitoring and error handling
- See [WEBSOCKET_SECURITY.md](./WEBSOCKET_SECURITY.md) for details

## 🔧 Required Environment Variables

```bash
# Authentication
JWT_SECRET                   - JWT signing secret
SHARED_SECRET                - Service-to-service auth secret

# WebSocket Security
SECURE                      - Set to "true" to enable WSS mode
SSL_CERT_PATH               - Path to SSL certificate (local dev only)
SSL_KEY_PATH                - Path to SSL key (local dev only)

# WordPress
WORDPRESS_API_URL           - WordPress API endpoint
WORDPRESS_USERNAME          - WordPress auth username
WORDPRESS_APP_PASSWORD      - WordPress app password

# SendGrid
SENDGRID_API_KEY            - SendGrid API key
SENDGRID_EMAIL              - SendGrid sender email
SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED - Template ID
SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE    - Template ID

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID     - GCP project ID
PENDING_APPRAISALS_SPREADSHEET_ID - Google Sheets ID
GOOGLE_SHEET_NAME           - Sheet name
EDIT_SHEET_NAME            - Edit sheet name

# OpenAI
OPENAI_API_KEY             - OpenAI API key
```

## 📦 Deployment

The service is deployed on Google Cloud Run with:
- Memory: 512Mi
- CPU: 1
- Min instances: 1
- Max instances: 10
- Port: 8080

## 📚 Code Style and Guidelines

The project follows specific code style guidelines:

- ES6+ JavaScript features
- Named exports preferred over default exports
- camelCase for variables/functions, PascalCase for classes
- 2-space indentation, semicolons required
- Try/catch blocks for async operations
- JSDoc comments for public APIs and complex functions
- Standardized API response format

See [CLAUDE.md](./CLAUDE.md) for detailed coding guidelines.

## 📋 Dependencies

The service relies on the following key dependencies:

- **Express.js**: Web framework
- **JWT**: Authentication and authorization
- **Google Cloud**: PubSub, Storage, Secret Manager
- **SendGrid**: Email service
- **WS**: WebSocket implementation
- **Axios**: HTTP client
- **Winston**: Logging
- **Jest**: Testing framework

## ⚖️ License

This project is proprietary and confidential. All rights reserved.