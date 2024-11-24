# Appraisal Management Backend

A robust backend service for managing art appraisals, integrating with OpenAI, Google Sheets, and SendGrid.

## Authentication

The backend supports three authentication methods:

### 1. JWT Token Authentication (Frontend Clients)
- Used for frontend web applications
- Token is set in httpOnly cookie
- Also returned in response for serverless clients

```json
{
  "success": true,
  "name": "User's name",
  "message": "Login successful",
  "token": "JWT token" // For serverless clients
}
```

### 2. Shared Secret Authentication (Backend-to-Backend)
- Used for service-to-service communication
- Requires `x-shared-secret` header
- More secure than JWT for backend services

### 3. Worker Token Authentication
- Special JWT tokens for worker processes
- Generated after shared secret validation
- Used for long-running background tasks

## Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/login` | Email/password login | No |
| `POST` | `/api/auth/logout` | Logout current user | Yes |
| `POST` | `/api/auth/refresh` | Refresh JWT token | Yes |

## Appraisals API

### List and View Endpoints

| Method | Endpoint | Description | Auth Required | Auth Methods |
|--------|----------|-------------|---------------|--------------|
| `GET` | `/api/appraisals` | Get all pending appraisals | Yes | JWT, Shared Secret |
| `GET` | `/api/appraisals/completed` | Get completed appraisals | Yes | JWT, Shared Secret |
| `GET` | `/api/appraisals/:id/list` | Get specific appraisal details | Yes | JWT |
| `GET` | `/api/appraisals/:id/list-edit` | Get appraisal details for editing | Yes | JWT |

### Process and Update Endpoints

| Method | Endpoint | Description | Auth Required | Auth Methods |
|--------|----------|-------------|---------------|--------------|
| `POST` | `/api/appraisals/process-request` | Process new appraisal request | Yes | Shared Secret |
| `POST` | `/api/appraisals/:id/set-value` | Set appraisal value and description | Yes | JWT |
| `POST` | `/api/appraisals/:id/merge-descriptions` | Merge AI and appraiser descriptions | Yes | JWT |
| `POST` | `/api/appraisals/:id/update-title` | Update WordPress post title | Yes | JWT |
| `POST` | `/api/appraisals/:id/insert-template` | Insert appraisal template | Yes | JWT |
| `POST` | `/api/appraisals/:id/build-pdf` | Generate PDF document | Yes | JWT |
| `POST` | `/api/appraisals/:id/send-email` | Send email to customer | Yes | JWT |
| `POST` | `/api/appraisals/:id/complete` | Mark appraisal as completed | Yes | JWT |
| `POST` | `/api/appraisals/:id/complete-process` | Start complete appraisal process | Yes | JWT |
| `POST` | `/api/appraisals/process-worker` | Process worker tasks | Yes | JWT, Shared Secret |
| `POST` | `/api/update-pending-appraisal` | Update pending appraisal status | Yes | Shared Secret |

## CORS Configuration

The backend supports requests from the following origins:

### Frontend Origins
- `https://earnest-choux-a0ec16.netlify.app`
- `https://jazzy-lollipop-0a3217.netlify.app`
- `https://lucent-nasturtium-01c2b7.netlify.app`
- `https://appraisers-frontend-856401495068.us-central1.run.app`
- `https://appraisers.appraisily.com`

### Backend Origins
- `https://michelle-gmail-856401495068.us-central1.run.app`
- `https://appraisers-task-queue-856401495068.us-central1.run.app`

### Development Origins
- `http://localhost:3000`
- `http://localhost:8080`

### CORS Options
```javascript
{
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Cookie', 
    'x-shared-secret'
  ],
  exposedHeaders: ['Set-Cookie']
}
```

## Environment Variables

```env
# Authentication
JWT_SECRET=<strong-random-secret>
SHARED_SECRET=<strong-random-secret>

# WordPress
WORDPRESS_API_URL=<api-url>
WORDPRESS_USERNAME=<username>
WORDPRESS_APP_PASSWORD=<secure-password>

# SendGrid
SENDGRID_API_KEY=<api-key>
SENDGRID_EMAIL=<email>
SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED=<template-id>
SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE=<template-id>

# Google Sheets
PENDING_APPRAISALS_SPREADSHEET_ID=<spreadsheet-id>
GOOGLE_SHEET_NAME=<sheet-name>
LOG_SPREADSHEET_ID=<log-id>
EDIT_SHEET_NAME=<edit-sheet>

# OpenAI
OPENAI_API_KEY=<api-key>

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=<project-id>
```

## Security

- JWT tokens stored in httpOnly cookies
- Shared secrets for backend-to-backend communication
- CORS configured for specific origins
- Helmet.js for security headers
- Input validation on all endpoints
- Rate limiting implemented

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error in development" // Only in development
}
```

Common HTTP status codes:
- `400` Bad Request - Invalid input
- `401` Unauthorized - Missing or invalid token
- `403` Forbidden - Valid token but insufficient permissions
- `404` Not Found - Resource not found
- `500` Internal Server Error - Server-side error

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

## License

This project is licensed under the MIT License.