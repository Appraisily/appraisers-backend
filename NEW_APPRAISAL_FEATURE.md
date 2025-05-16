# New Appraisal Feature Implementation

This document describes the implementation of the "Create New Appraisal" feature in the Appraisers Backend.

## Overview

The new appraisal feature allows appraisers to directly create new appraisals through the appraisers frontend, without requiring the customer to go through the normal payment processor flow. This is useful for internal appraisals or when an appraiser needs to manually add an appraisal to the system.

## API Endpoint

```
POST /api/appraisals/new
```

The endpoint accepts `multipart/form-data` to handle file uploads along with text data.

## Implementation Details

### 1. New Dependencies

- Added `express-fileupload` for handling file uploads in multipart/form-data requests

### 2. New Files Created

- `src/controllers/appraisal/newAppraisal.controller.js`: Controller for handling new appraisal submissions

### 3. Modified Files

- `src/app.js`: Added express-fileupload middleware
- `src/routes/appraisal.routes.js`: Added the new route
- `src/services/sheets.service.js`: Added the addPendingAppraisal method

### 4. Workflow

1. The frontend submits a form with customer details, appraisal details, and image files
2. The backend validates the required fields (customer name, email, session ID, description, main image)
3. A new row is added to the Pending Appraisals Google Sheet with the provided data
4. The images are temporarily saved to disk and then forwarded to the Payment Processor API
5. The Payment Processor API processes the images and starts the appraisal workflow
6. The temporary files are cleaned up
7. The API responds with the appraisal ID (Google Sheets row number) and session ID

## Request Format

```
POST /api/appraisals/new
Content-Type: multipart/form-data

Fields:
- description: String (required) - Detailed description of the item
- customerName: String (required) - Name of the customer
- customerEmail: String (required) - Email of the customer
- sessionId: String (required) - Unique identifier for tracking
- appraisalType: String (required) - Type of appraisal (Regular, Quick, Certificate)
- mainImage: File (required) - Main image of the item
- signatureImage: File (optional) - Image of signature
- ageImage: File (optional) - Image showing age information
```

## Response Format

Success (200 OK):
```json
{
  "success": true,
  "message": "Appraisal created successfully",
  "data": {
    "id": "123",
    "sessionId": "abc123"
  }
}
```

Error (400 Bad Request):
```json
{
  "success": false,
  "message": "Missing required field: description"
}
```

Error (500 Internal Server Error):
```json
{
  "success": false,
  "message": "Failed to create appraisal: Error details here"
}
```

## Security Considerations

- The endpoint requires authentication (uses the authenticate middleware)
- File uploads are limited to 10MB per file
- Only the required file formats are accepted (.jpg, .jpeg, .png, .gif, .webp)
- All user inputs are validated before processing 