# Appraisers Backend

This repository contains the backend service for the Appraisers application, which processes artwork appraisals through a multi-step pipeline.

## Overview

The backend consists of several services that work together to process appraisals:

1. **Appraisal Service**: Main orchestration service for appraisal processing
2. **AI Service**: Handles AI-powered image analysis and description generation
3. **Sheets Service**: Interfaces with Google Sheets for data storage and retrieval
4. **Email Service**: Sends notifications to customers
5. **WordPress Service**: Integrates with WordPress for content management
6. **Storage Service**: Manages file storage and retrieval
7. **PDF Service**: Generates PDF reports for appraisals

## Architecture

The application follows a service-oriented architecture where each service handles a specific responsibility. The main workflow is controlled by the Appraisal Service which coordinates the other services.

### File Structure

```
appraiasers-backend/
├── src/
│   ├── config/            # Configuration settings
│   ├── controllers/       # API route controllers
│   ├── middleware/        # Express middleware
│   ├── routes/            # API route definitions
│   ├── services/          # Service implementations
│   │   ├── ai.service.js            # AI processing service
│   │   ├── appraisal.service.js     # Main appraisal service
│   │   ├── appraisal.steps.js       # Step-by-step appraisal processing
│   │   ├── bulk.service.js          # Bulk appraisal handling
│   │   ├── emailService.js          # Email notifications
│   │   ├── index.js                 # Service registry and initialization
│   │   ├── pdf.service.js           # PDF generation
│   │   ├── pubsub.service.js        # Pub/Sub messaging service
│   │   ├── sheets.service.js        # Google Sheets integration
│   │   ├── storage.service.js       # File storage service
│   │   └── wordpress.service.js     # WordPress integration
│   └── utils/             # Utility functions
└── package.json           # Dependencies
```

## Service Classes and Functions

### Appraisal Service (appraisal.service.js)

The main service that orchestrates the appraisal process:

**Classes:**
- `AppraisalService`: Main service for creating and processing appraisals

**Key Methods:**
- `createAppraisal(appraisalData)`: Creates a new appraisal
- `createWordPressPost(appraisalId)`: Creates a WordPress post for the appraisal
- `completeAppraisal(appraisalId, postId, appraisalValue, description)`: Completes an appraisal

### Appraisal Steps (appraisal.steps.js)

Contains the step-by-step processing logic for appraisals:

**Key Functions:**
- `processFromStep(id, startStep, options)`: Processes an appraisal from a specific step
- `loadInitialData(context)`: Loads data for an appraisal
- `executeStep(context, step)`: Executes a specific processing step
- `mergeDescriptionsStep(context)`: Merges AI and appraiser descriptions
- `generateVisualizationStep(context)`: Generates visualizations
- `buildReportStep(context)`: Builds the final report
- `generatePdfStep(context)`: Generates PDF documents
- `sendEmailStep(context)`: Sends notifications
- `completeStep(context)`: Marks an appraisal as complete

### AI Service (ai.service.js)

Handles AI-powered image analysis and description generation:

**Classes:**
- `AIService`: Service for AI processing

**Key Methods:**
- `initialize()`: Sets up connection to the AI service
- `processImages(images, prompt)`: Processes images with the AI service
- `generateDescription(mainImageUrl, signatureImageUrl, ageImageUrl)`: Generates artwork descriptions
- `mergeDescriptions(appraiserDescription, iaDescription)`: Merges multiple descriptions

### Sheets Service (sheets.service.js)

Interfaces with Google Sheets for data storage:

**Classes:**
- `SheetsService`: Service for Google Sheets integration

**Key Methods:**
- `initialize()`: Sets up connection to Google Sheets
- `getValues(spreadsheetId, range)`: Retrieves values from a sheet
- `updateValues(spreadsheetId, range, values)`: Updates values in a sheet
- `getAppraisalRow(id, sheetName)`: Gets an appraisal by ID
- `updateAppraisalValue(id, value, description)`: Updates an appraisal's value

### Email Service (emailService.js)

Sends email notifications to customers:

**Classes:**
- `EmailService`: Service for email notifications

**Key Methods:**
- `sendAppraisalUpdateEmail(customerEmail, customerName, description, iaDescription)`: Sends update notifications
- `sendAppraisalCompletedEmail(customerEmail, customerName, appraisalData)`: Sends completion notifications

### Bulk Service (bulk.service.js)

Handles processing of bulk appraisals:

**Classes:**
- `BulkService`: Service for bulk appraisal operations

**Key Methods:**
- `getBulkImages(id)`: Gets images for a bulk appraisal
- `processBulkImages(id, images)`: Processes images for a bulk appraisal
- `sendToPaymentProcessor(session_id, customerEmail, customerName, images)`: Sends payment requests

## Environment Configuration

The backend services use environment variables for configuration. These can be set either through environment variables or using Google Cloud Runtime Variables.

Key environment variables:
- `SENDGRID_API_KEY`: API key for SendGrid email service
- `SENDGRID_EMAIL`: Sender email for notifications
- `SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE`: Email template ID for updates
- `SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED`: Email template ID for completions
- `PENDING_APPRAISALS_SPREADSHEET_ID`: Google Sheets ID for appraisal data
- `GOOGLE_SHEET_NAME`: Sheet name for pending appraisals
- `COMPLETED_SHEET_NAME`: Sheet name for completed appraisals
- `SHARED_SECRET`: Secret key for inter-service authentication

## Environment Variables

The backend requires the following environment variables:

```
PORT=8080
NODE_ENV=development
JWT_SECRET=your-jwt-secret
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
GOOGLE_CLOUD_PROJECT=your-google-cloud-project
STORAGE_BUCKET=your-gcs-bucket
WORDPRESS_API_URL=your-wordpress-api-url
WORDPRESS_USERNAME=your-wordpress-username
WORDPRESS_PASSWORD=your-wordpress-password
TASK_QUEUE_URL=https://appraisers-task-queue-856401495068.us-central1.run.app
```

## Deployment

The application is deployed on Google Cloud Run services, which allows access to Secret Manager for secure storage of API keys and other sensitive information.

A Dockerfile is used to build the application in Cloud Run so that secrets can be accessed securely. Environment variables are managed through Runtime Variables in Cloud Run rather than .env files.