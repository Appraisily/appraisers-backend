## Worker Migration Instructions

### Overview
This document outlines the steps to migrate appraisal processing operations from the API endpoints to a dedicated worker service.

### Current Flow
1. API receives request to `/api/appraisals/:id/complete-process`
2. API publishes message to PubSub topic 'appraisal-tasks'
3. Worker receives message and should process all steps

### PubSub Message Structure
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

### Required Services in Worker
```javascript
// Services needed in worker
const sheetsService = require('./services/sheets.service');
const wordpressService = require('./services/wordpress.service');
const openaiService = require('./services/openai.service');
const emailService = require('./services/email.service');
```

### Processing Steps

1. **Set Value** (`setAppraisalValue`)
```javascript
async function setAppraisalValue(id, appraisalValue, description) {
  // Update Google Sheets
  await sheetsService.updateValues(
    config.PENDING_APPRAISALS_SPREADSHEET_ID,
    `${config.GOOGLE_SHEET_NAME}!J${id}:K${id}`,
    [[appraisalValue, description]]
  );

  // Get WordPress URL
  const values = await sheetsService.getValues(
    config.PENDING_APPRAISALS_SPREADSHEET_ID,
    `${config.GOOGLE_SHEET_NAME}!G${id}`
  );

  const wordpressUrl = values[0][0];
  const postId = new URL(wordpressUrl).searchParams.get('post');

  // Update WordPress
  await wordpressService.updatePost(postId, {
    acf: { value: appraisalValue }
  });
}
```

2. **Merge Descriptions** (`mergeDescriptions`)
```javascript
async function mergeDescriptions(id, appraiserDescription) {
  // Get IA description
  const values = await sheetsService.getValues(
    config.PENDING_APPRAISALS_SPREADSHEET_ID,
    `${config.GOOGLE_SHEET_NAME}!H${id}`
  );

  const iaDescription = values[0][0];
  
  // Merge using OpenAI
  const mergedDescription = await openaiService.mergeDescriptions(
    appraiserDescription,
    iaDescription
  );

  // Save merged description
  await sheetsService.updateValues(
    config.PENDING_APPRAISALS_SPREADSHEET_ID,
    `${config.GOOGLE_SHEET_NAME}!L${id}`,
    [[mergedDescription]]
  );

  return mergedDescription;
}
```

3. **Update Title** (`updateTitle`)
```javascript
async function updateTitle(id, mergedDescription) {
  const values = await sheetsService.getValues(
    config.PENDING_APPRAISALS_SPREADSHEET_ID,
    `${config.GOOGLE_SHEET_NAME}!G${id}`
  );

  const wordpressUrl = values[0][0];
  const postId = new URL(wordpressUrl).searchParams.get('post');

  await wordpressService.updatePost(postId, {
    title: mergedDescription
  });

  return postId;
}
```

4. **Insert Template** (`insertTemplate`)
```javascript
async function insertTemplate(id) {
  const values = await sheetsService.getValues(
    config.PENDING_APPRAISALS_SPREADSHEET_ID,
    `${config.GOOGLE_SHEET_NAME}!A${id}:G${id}`
  );

  const row = values[0];
  const appraisalType = row[1] || 'RegularArt';
  const wordpressUrl = row[6];
  const postId = new URL(wordpressUrl).searchParams.get('post');

  const wpData = await wordpressService.getPost(postId);
  let content = wpData.content?.rendered || '';

  if (!content.includes('[pdf_download]')) {
    content += '\n[pdf_download]';
  }

  if (!content.includes(`[AppraisalTemplates type="${appraisalType}"]`)) {
    content += `\n[AppraisalTemplates type="${appraisalType}"]`;
  }

  await wordpressService.updatePost(postId, {
    content,
    acf: {
      shortcodes_inserted: true
    }
  });
}
```

5. **Build PDF** (`buildPdf`)
```javascript
async function buildPdf(id) {
  const values = await sheetsService.getValues(
    config.PENDING_APPRAISALS_SPREADSHEET_ID,
    `${config.GOOGLE_SHEET_NAME}!A${id}:G${id}`
  );

  const row = values[0];
  const wordpressUrl = row[6];
  const postId = new URL(wordpressUrl).searchParams.get('post');

  const wpData = await wordpressService.getPost(postId);
  const session_ID = wpData.acf?.session_id;

  const response = await fetch(
    'https://appraisals-backend-856401495068.us-central1.run.app/generate-pdf',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, session_ID })
    }
  );

  if (!response.ok) {
    throw new Error('Failed to generate PDF');
  }

  const data = await response.json();
  await sheetsService.updateValues(
    config.PENDING_APPRAISALS_SPREADSHEET_ID,
    `${config.GOOGLE_SHEET_NAME}!M${id}:N${id}`,
    [[data.pdfLink, data.docLink]]
  );

  return {
    pdfLink: data.pdfLink,
    docLink: data.docLink
  };
}
```

6. **Send Email** (`sendEmail`)
```javascript
async function sendEmail(id) {
  const values = await sheetsService.getValues(
    config.PENDING_APPRAISALS_SPREADSHEET_ID,
    `${config.GOOGLE_SHEET_NAME}!A${id}:N${id}`
  );

  const row = values[0];
  const customerEmail = row[3];
  const customerName = row[4];
  const wordpressUrl = row[6];
  const appraisalValue = row[9];
  const description = row[10];
  const pdfLink = row[12];

  await emailService.sendAppraisalCompletedEmail(customerEmail, customerName, {
    value: appraisalValue,
    description: description,
    pdfLink: pdfLink,
    wordpressUrl: wordpressUrl
  });
}
```

7. **Complete** (`complete`)
```javascript
async function complete(id, appraisalValue, description) {
  await sheetsService.updateValues(
    config.PENDING_APPRAISALS_SPREADSHEET_ID,
    `${config.GOOGLE_SHEET_NAME}!F${id}`,
    [['Completed']]
  );

  await sheetsService.updateValues(
    config.PENDING_APPRAISALS_SPREADSHEET_ID,
    `${config.GOOGLE_SHEET_NAME}!J${id}:K${id}`,
    [[appraisalValue, description]]
  );
}
```

### Main Worker Process
```javascript
async function processAppraisal(id, appraisalValue, description) {
  try {
    // Step 1: Set Value
    await setAppraisalValue(id, appraisalValue, description);
    console.log('✓ Value set successfully');

    // Step 2: Merge Descriptions
    const mergedDescription = await mergeDescriptions(id, description);
    console.log('✓ Descriptions merged successfully');

    // Step 3: Update Title
    const postId = await updateTitle(id, mergedDescription);
    console.log('✓ Title updated successfully');

    // Step 4: Insert Template
    await insertTemplate(id);
    console.log('✓ Template inserted successfully');

    // Step 5: Build PDF
    await buildPdf(id);
    console.log('✓ PDF built successfully');

    // Step 6: Send Email
    await sendEmail(id);
    console.log('✓ Email sent successfully');

    // Step 7: Mark as Complete
    await complete(id, appraisalValue, description);
    console.log('✓ Appraisal marked as complete');

  } catch (error) {
    console.error('Error processing appraisal:', error);
    throw error;
  }
}
```

### Message Handler
```javascript
async function handleMessage(message) {
  try {
    const data = JSON.parse(message.data.toString());
    
    if (data.type !== 'COMPLETE_APPRAISAL') {
      console.log('Ignoring unknown task type:', data.type);
      message.ack();
      return;
    }

    const { id, appraisalValue, description } = data.data;
    await processAppraisal(id, appraisalValue, description);
    
    message.ack();
  } catch (error) {
    console.error('Error processing message:', error);
    message.nack();
  }
}
```

### Required Dependencies
```json
{
  "dependencies": {
    "@google-cloud/pubsub": "^3.7.1",
    "@google-cloud/secret-manager": "^5.6.0",
    "@sendgrid/mail": "^7.7.0",
    "googleapis": "^105.0.0",
    "node-fetch": "^2.6.7",
    "openai": "^4.20.1"
  }
}
```

### Configuration Required
```javascript
const config = {
  PENDING_APPRAISALS_SPREADSHEET_ID: process.env.PENDING_APPRAISALS_SPREADSHEET_ID,
  GOOGLE_SHEET_NAME: process.env.GOOGLE_SHEET_NAME,
  WORDPRESS_API_URL: process.env.WORDPRESS_API_URL,
  WORDPRESS_USERNAME: process.env.WORDPRESS_USERNAME,
  WORDPRESS_APP_PASSWORD: process.env.WORDPRESS_APP_PASSWORD,
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  SENDGRID_EMAIL: process.env.SENDGRID_EMAIL,
  SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED: process.env.SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED
};
```

### Notes
1. All operations should be moved to the worker service
2. The API endpoints should only publish messages to PubSub
3. Error handling should be implemented at each step
4. Each step should update the status in Google Sheets
5. Implement retries for critical operations
6. Log all steps for debugging