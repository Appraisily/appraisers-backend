# Appraisers Backend Service

A robust Node.js backend service for managing art appraisals, providing secure API endpoints for authentication, appraisal management, and integration with various services.

## Features

### Authentication
- JWT-based authentication with secure cookie storage
- Authorized users whitelist
- Token refresh mechanism
- Backend-to-backend authentication using shared secrets

### Appraisal Management
- List pending and completed appraisals
- Detailed appraisal information retrieval
- Value setting and updating
- Automated appraisal processing pipeline
- PDF generation and document management
- Email notifications with customizable delays

### Integrations
- WordPress CMS for content management
- Google Sheets for data storage
- SendGrid for email communications
- Michelle AI service for image analysis
- Google Cloud PubSub for asynchronous processing

## API Endpoints

### Authentication
```
POST /api/auth/login         - User login
POST /api/auth/logout        - User logout
POST /api/auth/refresh      - Refresh JWT token
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

## Services

### AI Service
- Image analysis and description generation
- Description merging capabilities
- Integration with Michelle AI service
- Handles image processing and text generation

### Email Service
- Automated email notifications
- Customizable email templates
- Delayed sending capability (12-minute delay)
- SendGrid integration

### WordPress Service
- Content management
- Post creation and updates
- ACF fields handling
- Template insertion

### Sheets Service
- Data storage and retrieval
- Value updates
- Status tracking
- Google Sheets integration

### PubSub Service
- Asynchronous task processing
- Message queuing
- Background job handling

## Security Features

- JWT-based authentication
- HTTP-only cookies
- CORS protection
- Shared secret for service-to-service communication
- API key validation
- Request validation middleware

## Configuration

Required environment variables:
```
JWT_SECRET                   - Secret for JWT signing
SHARED_SECRET               - Secret for service-to-service auth
WORDPRESS_API_URL           - WordPress API endpoint
WORDPRESS_USERNAME          - WordPress authentication
WORDPRESS_APP_PASSWORD      - WordPress app password
SENDGRID_API_KEY           - SendGrid API key
SENDGRID_EMAIL             - SendGrid sender email
GOOGLE_CLOUD_PROJECT_ID    - GCP project ID
DIRECT_API_KEY             - Michelle AI service API key
```

## Processing Pipeline

1. **Initial Update**
   - Receive appraisal data
   - Generate AI description
   - Update WordPress post
   - Store data in Google Sheets

2. **Value Setting**
   - Set appraisal value
   - Update WordPress ACF fields
   - Update sheets data

3. **Description Processing**
   - Merge AI and appraiser descriptions
   - Update post title
   - Insert templates

4. **Document Generation**
   - Generate PDF document
   - Create supporting documents
   - Store document links

5. **Notification**
   - Send email to customer (12-minute delay)
   - Include relevant links and information

## Error Handling

- Comprehensive error logging
- Error response standardization
- Automatic retry mechanisms
- Fallback strategies

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

The service is deployed on Google Cloud Run with the following specifications:
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

## Dependencies

Main dependencies include:
- express
- @google-cloud/pubsub
- @google-cloud/secret-manager
- @sendgrid/mail
- googleapis
- jsonwebtoken
- node-fetch
- cookie-parser
- cors

## License

This project is proprietary and confidential. All rights reserved.