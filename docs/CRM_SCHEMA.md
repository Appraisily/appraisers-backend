# CRM Integration Schema

This document outlines the message schema required when sending notifications to the CRM system via Google Cloud Pub/Sub.

## Appraisal Ready Notification Schema

When an appraisal is completed and ready for a customer, the following JSON structure must be used:

```json
{
  "crmProcess": "bulkAppraisalFinalized",     // Required - MUST be exactly this value
  "customer": {                               // Required object
    "email": "customer@example.com",          // Required
    "name": "John Doe"                        // Optional, defaults to 'Customer'
  },
  "metadata": {                               // Required object
    "origin": "appraisal-service",            // Required - Identifies the sending system
    "sessionId": "sess_67890",                // Required - The appraisal session ID
    "environment": "production",              // Required - "production", "development", etc.
    "timestamp": 1686839700000                // Required - Milliseconds since epoch (numeric)
  },
  "pdf_link": "https://example.com/appraisals/report.pdf",  // Required for this processor
  "wp_link": "https://example.com/appraisals/vintage-watch"  // Required for this processor
}
```

## Required Fields

- `crmProcess`: Must be set to "bulkAppraisalFinalized" exactly to route to the correct processor
- `customer`: Object containing customer information
  - `customer.email`: The customer's email address
  - `customer.name`: The customer's name (optional, defaults to "Customer")
- `metadata`: Object containing metadata about the notification
  - `metadata.origin`: The system sending the notification (e.g., "appraisers-backend")
  - `metadata.sessionId`: The session ID of the appraisal
  - `metadata.environment`: The environment ("production", "development", etc.)
  - `metadata.timestamp`: Timestamp in milliseconds since epoch (numeric)
- `pdf_link`: URL to the PDF version of the appraisal report
- `wp_link`: URL to the WordPress page with the appraisal content

## Valid CRM Process Types

The CRM system supports the following process types:
- `screenerNotification`
- `chatSummary`
- `gmailInteraction`
- `appraisalRequest`
- `stripePayment`
- `bulkAppraisalEmailUpdate`
- `bulkAppraisalFinalized` (use this for appraisal completion notifications)

## Example Usage

```javascript
const messageData = {
  crmProcess: "bulkAppraisalFinalized",
  customer: {
    email: customerEmail,
    name: customerName || "Customer"
  },
  metadata: {
    origin: "appraisers-backend",
    sessionId: sessionId,
    environment: process.env.NODE_ENV || "production",
    timestamp: Date.now()
  },
  pdf_link: pdfLink,
  wp_link: wpLink
};
``` 