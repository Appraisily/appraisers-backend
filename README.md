# Appraisers Backend Service

A robust Node.js backend service for managing art appraisals, providing secure API endpoints for authentication, appraisal management, and integration with various services.

## Core Features

### Authentication
- Multiple authentication methods:
  - Email/Password login
  - Google Sign-In integration
  - JWT-based session management
  - Secure HTTP-only cookies
  - Token refresh mechanism
  - Backend-to-backend authentication using shared secrets

### Appraisal Management
- Comprehensive appraisal workflow:
  - List pending and completed appraisals
  - Detailed appraisal information retrieval
  - Value setting and updating
  - Automated appraisal processing pipeline
  - PDF generation and document management
  - Email notifications with customizable delays

### Service Integrations
- WordPress CMS integration
- Google Sheets for data storage
- SendGrid for email communications
- OpenAI/Michelle AI for image analysis
- Google Cloud PubSub for async processing

## API Endpoints

### Authentication
```
POST /api/auth/login         - Traditional login
POST /api/auth/google        - Google Sign-In
POST /api/auth/refresh       - Refresh JWT token
POST /api/auth/logout        - User logout
```

### Appraisals
```
GET  /api/appraisals              - List pending appraisals
GET  /api/appraisals/completed    - List completed appraisals
GET  /api/appraisals/:id/list     - Get appraisal details
GET  /api/appraisals/:id/list-edit - Get appraisal details for editing
POST /api/appraisals/:id/set-value - Set appraisal value
POST /api/appraisals/:id/complete-process - Start appraisal processing
```

### Update Pending Appraisal
```
POST /api/update-pending-appraisal - Update pending appraisal with new data
```

## Services Architecture

### AI Service
- Image analysis capabilities
- Description generation
- Description merging
- Integration with Michelle AI

### Email Service
- Automated notifications
- Customizable templates
- Delayed sending capability
- SendGrid integration

### WordPress Service
- Content management
- Post creation/updates
- ACF fields handling
- Template management

### Sheets Service
- Data storage/retrieval
- Value updates
- Status tracking
- Google Sheets integration

### PubSub Service
- Async task processing
- Message queuing
- Background job handling

## Security Features

- Multiple authentication methods
- HTTP-only cookies
- CORS protection
- Service-to-service authentication
- API key validation
- Request validation middleware

## Configuration

Required environment variables:
```
JWT_SECRET                   - JWT signing secret
GOOGLE_CLIENT_ID            - Google OAuth client ID
SHARED_SECRET               - Service-to-service auth secret
WORDPRESS_API_URL           - WordPress API endpoint
WORDPRESS_USERNAME          - WordPress auth username
WORDPRESS_APP_PASSWORD      - WordPress app password
SENDGRID_API_KEY           - SendGrid API key
SENDGRID_EMAIL             - SendGrid sender email
GOOGLE_CLOUD_PROJECT_ID    - GCP project ID
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run in production mode
npm start

# Run tests
npm test

# Run linting
npm run lint
```

## Deployment

The service is deployed on Google Cloud Run with:
- Memory: 512Mi
- CPU: 1
- Min instances: 1
- Max instances: 10
- Port: 8080

## Architecture

```
┌─────────────────┐         ┌──────────────┐         ┌─────────────────┐
│  Frontend App   │ ──────> │   Backend    │ ──────> │  Google PubSub  │
└─────────────────┘         └──────────────┘         └─────────────────┘
                                  │
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
              ┌─────┴─────┐             ┌──────┴──────┐
              │ WordPress │             │ Google       │
              │   CMS     │             │ Sheets      │
              └───────────┘             └─────────────┘
```

## Service Validation

Each service must implement and validate required methods:

### WordPress Service
- initialize()
- getPost()
- updatePost()

### Sheets Service
- initialize()
- getValues()
- updateValues()

### Email Service
- initialize()
- sendAppraisalCompletedEmail()
- sendAppraisalUpdateEmail()

### PubSub Service
- initialize()
- publishMessage()

### AI Service
- initialize()
- generateDescription()
- mergeDescriptions()

## Dependencies

Main dependencies:
- express
- @google-cloud/pubsub
- @google-cloud/secret-manager
- google-auth-library
- @sendgrid/mail
- googleapis
- jsonwebtoken
- node-fetch
- cookie-parser
- cors
- helmet

## License

This project is proprietary and confidential. All rights reserved.