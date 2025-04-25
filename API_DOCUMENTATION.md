# API Documentation System

This codebase includes a comprehensive API documentation system that automatically provides usage instructions when malformed requests are made.

## Features

1. **Interactive Documentation**: When a request fails validation, the response includes detailed documentation about how to use the endpoint correctly.

2. **Consistent Error Format**:
   - All errors follow the format: `{ success: false, message: "Error message", documentation: "..." }`
   - The documentation field is added automatically for client errors (4xx status codes)

3. **Rich Documentation Content**:
   - Endpoint descriptions
   - Required and optional parameters
   - Expected request body format with examples
   - Example responses
   - Related endpoints

4. **Generated Documentation File**: You can generate a complete API documentation file using the provided script.

## Usage

### Documenting Routes

Use the `registerRoute` function to add documentation to routes:

```javascript
const { registerRoute } = require('../utils/routeDecorator');

registerRoute(router, 'get', '/endpoint-path', {
  description: 'Description of what this endpoint does',
  parameters: {
    id: {
      description: 'Parameter description',
      required: true
    }
  },
  requestBody: {
    // Example request body as a JSON object
    field1: 'value1',
    field2: 'value2'
  },
  response: {
    // Example response as a JSON object
    success: true,
    data: {
      result: 'Example result'
    }
  }
}, authenticate, controller.handlerFunction);
```

### Generating Documentation

Run the documentation generator script:

```bash
npm run generate-docs
```

This will create an `api-docs.md` file in the project root with the complete API documentation.

## How It Works

1. The system stores documentation for each route in a central registry.

2. When an error occurs (like validation failure or 404), the error handler middleware enhances the response with relevant documentation.

3. For 404 errors, the system attempts to find similar endpoints to suggest alternatives.

4. Validation middleware captures specific validation issues and includes relevant endpoint documentation in the error response.

## Best Practices

1. **Document All Routes**: Always add documentation when defining routes.

2. **Be Specific About Parameters**: Clearly document all parameters, including whether they're required.

3. **Provide Realistic Examples**: Use realistic examples for request bodies and responses.

4. **Include Validation Rules**: Document any validation requirements for parameters or request body fields.

5. **Generate Documentation Regularly**: Run the documentation generator after making API changes to keep the documentation up-to-date.

## Image Analysis with GPT-4o

### Analyze Image and Merge Descriptions

**Endpoint**: `POST /api/appraisals/analyze-image-and-merge`

**Description**: Analyzes an image using GPT-4o and merges descriptions

**Authentication**: Required

**Request Body**:

```json
{
  "id": "140",
  "postId": "145911",
  "description": "Optional customer description"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Request to analyze image for appraisal 140 has been submitted",
  "timestamp": "2023-01-02T00:00:00Z"
}
```

**Example Usage**:

```javascript
// Example API call from frontend
async function analyzeImage(id, postId, description = '') {
  try {
    const response = await fetch('/api/appraisals/analyze-image-and-merge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        id,
        postId,
        description
      })
    });

    const result = await response.json();
    if (result.success) {
      console.log('Image analysis request submitted successfully');
      // You may want to poll for status updates or show a notification to the user
    } else {
      console.error('Failed to submit image analysis request:', result.message);
    }
  } catch (error) {
    console.error('Error calling image analysis endpoint:', error);
  }
}
```