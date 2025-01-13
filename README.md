# Appraisers Backend Service

A robust Node.js backend service for managing art appraisals, providing secure API endpoints for authentication, appraisal management, and integration with various services.

## Features

### Authentication
- JWT-based authentication with HTTP-only cookies
- Secure token refresh mechanism
- Role-based access control
- Backend-to-backend authentication using shared secrets

### Appraisal Management
- List pending and completed appraisals
- Detailed appraisal information retrieval
- Value setting and updating
- Automated appraisal processing pipeline
- PDF generation and document management
- Email notifications with customizable delays

### AI Integration
- Image analysis using Michelle AI service
- Automated artwork description generation
- Description merging capabilities
- Secure API key management through Secret Manager

### Service Integrations
- WordPress CMS integration for content management
- Google Sheets for data storage
- SendGrid for email communications
- Google Cloud PubSub for async processing
- Google Secret Manager for secure configuration

## API Endpoints

### Authentication
```
POST /api/auth/login         - User login
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
POST /api/appraisals/:id/update-acf-field - Update WordPress ACF field
POST /api/appraisals/get-session-id - Get session ID
POST /api/appraisals/:id/save-links - Save document links
POST /api/appraisals/:id/update-links - Update document links
POST /api/appraisals/:id/complete - Mark appraisal as complete
```

### Update Pending Appraisal
```
POST /api/update-pending-appraisal - Update pending appraisal with new data
```

## Services Architecture

### AI Service
- Endpoint: Michelle AI service
- Features:
  - Image analysis
  - Description generation
  - Description merging
- Security:
  - API key from Secret Manager
  - Secure image processing
  - Error handling and retries

### Email Service
- Provider: SendGrid
- Features:
  - Automated notifications
  - Customizable templates
  - Delayed sending capability
- Templates:
  - Appraisal update notification
  - Appraisal completion notification

### WordPress Service
- Features:
  - Content management
  - ACF fields handling
  - Post updates
  - Document links management

### Sheets Service
- Features:
  - Data storage/retrieval
  - Value updates
  - Status tracking
  - Document links management

### PubSub Service
- Features:
  - Async task processing
  - Message queuing
  - Background job handling

## Security Features

### Authentication
- JWT tokens with HTTP-only cookies
- Secure token refresh mechanism
- Role-based access control
- Backend-to-backend shared secrets

### API Security
- Request validation middleware
- CORS protection
- Rate limiting
- Error handling middleware

### Secrets Management
- Google Secret Manager integration
- Secure configuration loading
- Environment-based settings

## Required Environment Variables

```bash
# Authentication
JWT_SECRET                   - JWT signing secret
SHARED_SECRET               - Service-to-service auth secret

# WordPress
WORDPRESS_API_URL           - WordPress API endpoint
WORDPRESS_USERNAME          - WordPress auth username
WORDPRESS_APP_PASSWORD      - WordPress app password

# SendGrid
SENDGRID_API_KEY           - SendGrid API key
SENDGRID_EMAIL             - SendGrid sender email
SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED - Template ID
SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE    - Template ID

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID    - GCP project ID
PENDING_APPRAISALS_SPREADSHEET_ID - Google Sheets ID
GOOGLE_SHEET_NAME          - Sheet name
EDIT_SHEET_NAME           - Edit sheet name

# AI Service
DIRECT_API_KEY            - Michelle AI service API key
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
                                             │
                                      ┌──────┴──────┐
                                      │ Michelle AI │
                                      └────────────┘
```

## Dependencies

Main dependencies:
```json
{
  "dependencies": {
    "@google-cloud/pubsub": "^3.7.1",
    "@google-cloud/secret-manager": "^5.6.0",
    "@sendgrid/mail": "^7.7.0",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "googleapis": "^105.0.0",
    "jsonwebtoken": "^9.0.2",
    "node-fetch": "^2.6.7"
  }
}
```

## License

This project is proprietary and confidential. All rights reserved.