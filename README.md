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

## API Endpoints

### Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/login` | Email/password login | No |
| `POST` | `/api/auth/logout` | Logout current user | Yes |
| `POST` | `/api/auth/refresh` | Refresh JWT token | Yes |

### Appraisals
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/appraisals` | List pending appraisals | Yes |
| `GET` | `/api/appraisals/completed` | List completed appraisals | Yes |
| `GET` | `/api/appraisals/:id/list` | Get appraisal details | Yes |
| `POST` | `/api/appraisals/:id/complete-process` | Start appraisal processing | Yes |

## Message Format

When publishing to PubSub, messages follow this format:

```json
{
  "type": "COMPLETE_APPRAISAL",
  "data": {
    "id": "string",
    "appraisalValue": "number",
    "description": "string"
  }
}
```

## Environment Variables

```env
# Authentication
JWT_SECRET=<strong-random-secret>
SHARED_SECRET=<strong-random-secret>

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=<project-id>

# PubSub Topics
PUBSUB_APPRAISAL_TOPIC=appraisal-tasks
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

## License

This project is licensed under the MIT License.