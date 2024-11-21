# Appraisal Management Backend

A robust backend service for managing art appraisals, integrating with OpenAI, Google Sheets, and SendGrid.

## Authentication

### Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/login` | Email/password login | No |
| `POST` | `/api/auth/logout` | Logout current user | Yes |
| `POST` | `/api/auth/refresh` | Refresh JWT token | Yes |

### Authentication Response Format
```json
{
  "success": true/false,
  "name": "User's name",
  "message": "Optional message",
  "token": "JWT token" // For serverless clients
}
```

## Appraisals API

### List and View Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/appraisals` | Get all pending appraisals | Yes |
| `GET` | `/api/appraisals/completed` | Get completed appraisals | Yes |
| `GET` | `/api/appraisals/:id/list` | Get specific appraisal details | Yes |
| `GET` | `/api/appraisals/:id/list-edit` | Get appraisal details for editing | Yes |

### Process and Update Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/appraisals/process-request` | Process new appraisal request | Shared Secret |
| `POST` | `/api/appraisals/:id/set-value` | Set appraisal value and description | Yes |
| `POST` | `/api/appraisals/:id/merge-descriptions` | Merge AI and appraiser descriptions | Yes |
| `POST` | `/api/appraisals/:id/update-title` | Update WordPress post title | Yes |
| `POST` | `/api/appraisals/:id/insert-template` | Insert appraisal template | Yes |
| `POST` | `/api/appraisals/:id/build-pdf` | Generate PDF document | Yes |
| `POST` | `/api/appraisals/:id/send-email` | Send email to customer | Yes |
| `POST` | `/api/appraisals/:id/complete` | Mark appraisal as completed | Yes |
| `POST` | `/api/appraisals/:id/complete-process` | Start complete appraisal process | Yes |
| `POST` | `/api/appraisals/process-worker` | Process worker tasks | Yes |
| `POST` | `/api/update-pending-appraisal` | Update pending appraisal status | Yes |

## Worker Process Flow

The worker follows this sequential process for completing appraisals:

1. **Set Value** - `/api/appraisals/:id/set-value`
   - Sets initial appraisal value and description
   - Payload: `{ appraisalValue, description }`

2. **Merge Descriptions** - `/api/appraisals/:id/merge-descriptions`
   - Merges any additional descriptions
   - Payload: `{ description }`

3. **Update Title** - `/api/appraisals/:id/update-title`
   - Updates the post title
   - Payload: `{ title }` (formatted as "Appraisal #:id")

4. **Insert Template** - `/api/appraisals/:id/insert-template`
   - Inserts the appraisal template
   - No payload required

5. **Build PDF** - `/api/appraisals/:id/build-pdf`
   - Generates the PDF document using Appraisals Backend
   - Makes request to: `https://appraisals-backend-856401495068.us-central1.run.app/build-pdf`
   - Payload:
     ```json
     {
       "title": "string",
       "images": {
         "front": "string (URL)",
         "back": "string (URL)",
         "signature": "string (URL)"
       }
     }
     ```

6. **Send Email** - `/api/appraisals/:id/send-email`
   - Sends notification email
   - No payload required

7. **Complete** - `/api/appraisals/:id/complete`
   - Marks the appraisal as complete
   - Payload: `{ appraisalValue, description }`

## Request/Response Examples

### Process New Appraisal Request

```http
POST /api/appraisals/process-request
Headers:
  x-shared-secret: your-secret-here
  Content-Type: application/json

Body:
{
  "session_id": "string",
  "post_edit_url": "string",
  "images": {
    "main": "url",
    "signature": "url",
    "age": "url"
  },
  "customer_email": "string",
  "customer_name": "string"
}

Response:
{
  "success": true,
  "message": "Appraisal request processed successfully",
  "title": "Generated description"
}
```

### Set Appraisal Value

```http
POST /api/appraisals/:id/set-value
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Body:
{
  "appraisalValue": number,
  "description": "string"
}

Response:
{
  "success": true,
  "message": "Appraisal value set successfully"
}
```

### Complete Appraisal Process

```http
POST /api/appraisals/:id/complete-process
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Body:
{
  "appraisalValue": number,
  "description": "string"
}

Response:
{
  "success": true,
  "message": "Appraisal process started successfully"
}
```

## Environment Variables

```env
# Authentication
JWT_SECRET=
SHARED_SECRET=

# WordPress
WORDPRESS_API_URL=
WORDPRESS_USERNAME=
WORDPRESS_APP_PASSWORD=

# SendGrid
SENDGRID_API_KEY=
SENDGRID_EMAIL=
SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED=
SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE=

# Google Sheets
PENDING_APPRAISALS_SPREADSHEET_ID=
GOOGLE_SHEET_NAME=
LOG_SPREADSHEET_ID=
EDIT_SHEET_NAME=

# OpenAI
OPENAI_API_KEY=

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=
```

## Security

- All endpoints except authentication require valid JWT token
- Process request endpoint requires shared secret
- Passwords are hashed using bcrypt
- CORS configured for specific origins
- Rate limiting implemented
- Input validation on all endpoints

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description"
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