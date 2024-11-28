# Appraisal Management Backend

A robust backend service for managing art appraisals, integrating with Google Cloud PubSub for asynchronous processing.

## Architecture Overview

```
┌─────────────────┐         ┌──────────────┐         ┌─────────────────┐
│  Frontend App   │ ──────> │   Backend    │ ──────> │  Google PubSub  │
└─────────────────┘         └──────────────┘         └─────────────────┘
                                                             │
                                                             │
                                                             ▼
                                                    ┌─────────────────┐
                                                    │ Worker Service  │
                                                    └─────────────────┘
```

## Process Flow

1. Frontend sends appraisal data to backend
2. Backend validates and publishes message to PubSub
3. Worker service (separate application) processes the appraisal
4. Results are stored in Google Sheets and WordPress

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required | Request Body | Response |
|--------|----------|-------------|---------------|--------------|-----------|
| `POST` | `/api/auth/login` | Login with email/password | No | `{ email: string, password: string }` | `{ success: true, name: string, token?: string }` |
| `POST` | `/api/auth/logout` | Logout current user | Yes | - | `{ success: true, message: string }` |
| `POST` | `/api/auth/refresh` | Refresh JWT token | Yes | - | `{ success: true, token?: string }` |

### Appraisals

| Method | Endpoint | Description | Auth Required | Request Body | Response |
|--------|----------|-------------|---------------|--------------|-----------|
| `GET` | `/api/appraisals` | List pending appraisals | Yes | - | `Array<Appraisal>` |
| `GET` | `/api/appraisals/completed` | List completed appraisals | Yes | - | `Array<Appraisal>` |
| `GET` | `/api/appraisals/:id/list` | Get appraisal details | Yes | - | `Appraisal` |
| `GET` | `/api/appraisals/:id/list-edit` | Get appraisal details for editing | Yes | - | `Appraisal` |
| `POST` | `/api/appraisals/:id/set-value` | Set appraisal value | Yes | `{ appraisalValue: number, description: string }` | `{ success: true }` |
| `POST` | `/api/appraisals/:id/complete-process` | Start appraisal processing | Yes | `{ appraisalValue: number, description: string }` | `{ success: true }` |

### Update Pending Appraisal

| Method | Endpoint | Description | Auth Required | Headers | Request Body |
|--------|----------|-------------|---------------|---------|--------------|
| `POST` | `/api/update-pending-appraisal` | Update pending appraisal | Yes | `x-shared-secret` | `{ description: string, images: object, post_id: string, customer_email: string, session_id: string }` |

## Data Models

### Appraisal Object
```typescript
interface Appraisal {
  id: number;
  date: string;
  appraisalType: string;
  identifier: string;
  status: string;
  wordpressUrl: string;
  iaDescription: string;
  customerEmail?: string;
  customerName?: string;
  customerDescription?: string;
  images?: {
    main?: string;
    age?: string;
    signature?: string;
  };
  acfFields?: Record<string, any>;
}
```

## Route Initialization

Routes are initialized and validated in the following order:

1. Individual route modules define their specific endpoints:
   - `auth.routes.js` - Authentication routes
   - `appraisal.routes.js` - Appraisal management routes
   - `updatePending.routes.js` - Update pending appraisal route

2. Routes are mounted in `routes/index.js`:
```javascript
router.use('/auth', authRoutes);
router.use('/appraisals', appraisalRoutes);
router.use('/update-pending-appraisal', updatePendingRoutes);
```

3. Route validation ensures all mounted routes are valid Express.Router instances

## Authentication Methods

### 1. JWT Token Authentication (Frontend Clients)
- Token stored in httpOnly cookie
- 24-hour expiration
- Automatic refresh mechanism

```javascript
// Login Response
{
  success: true,
  name: string,
  message: "Login successful",
  token?: string // Optional, for serverless clients
}
```

### 2. Shared Secret Authentication (Backend-to-Backend)
```javascript
// Headers
{
  'x-shared-secret': 'your-shared-secret'
}
```

### 3. Worker Token Authentication
- Generated after shared secret validation
- Used for background processing tasks

## Error Handling

All endpoints return errors in a consistent format:

```javascript
{
  success: false,
  message: string,
  error?: string // Only in development
}
```

Common HTTP Status Codes:
- `400` Bad Request - Invalid input data
- `401` Unauthorized - Missing/invalid authentication
- `403` Forbidden - Valid auth but insufficient permissions
- `404` Not Found - Resource doesn't exist
- `500` Internal Server Error - Server-side error

## Environment Variables

```env
# Authentication
JWT_SECRET=<strong-random-secret>
SHARED_SECRET=<strong-random-secret>

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=<project-id>

# WordPress
WORDPRESS_API_URL=<api-url>
WORDPRESS_USERNAME=<username>
WORDPRESS_APP_PASSWORD=<app-password>

# SendGrid
SENDGRID_API_KEY=<api-key>
SENDGRID_EMAIL=<sender-email>
SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED=<template-id>
SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE=<template-id>

# Google Sheets
PENDING_APPRAISALS_SPREADSHEET_ID=<spreadsheet-id>
GOOGLE_SHEET_NAME=<sheet-name>

# OpenAI
OPENAI_API_KEY=<api-key>
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

## Security Features

- JWT tokens in httpOnly cookies
- Shared secret for service-to-service communication
- CORS configured for specific origins
- Helmet.js security headers
- Input validation on all endpoints
- Rate limiting
- Request logging
- Error tracking

## License

This project is licensed under the MIT License.