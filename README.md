<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Appraisal Management Backend</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            padding: 20px;
            max-width: 1000px;
            margin: auto;
        }
        h1, h2, h3, h4 {
            color: #333;
        }
        pre {
            background-color: #f4f4f4;
            padding: 10px;
            overflow-x: auto;
        }
        code {
            background-color: #f4f4f4;
            padding: 2px 4px;
            border-radius: 4px;
        }
        ul {
            list-style-type: disc;
            margin-left: 20px;
        }
        a {
            color: #0366d6;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        .endpoint {
            margin-bottom: 20px;
            border-left: 3px solid #0366d6;
            padding-left: 15px;
        }
    </style>
</head>
<body>

    <h1>Appraisal Management Backend</h1>

    <h2>Authentication</h2>
    
    <h3>Endpoints</h3>
    <ul>
        <li><code>POST /api/auth/google</code> - Google OAuth login</li>
        <li><code>POST /api/auth/login</code> - Email/password login</li>
        <li><code>POST /api/auth/logout</code> - Logout</li>
        <li><code>POST /api/auth/refresh</code> - Refresh JWT token</li>
    </ul>

    <h3>Response Format</h3>
    <pre><code>{
  "success": true/false,
  "name": "User's name",
  "message": "Optional message",
  "token": "JWT token" // For serverless clients
}</code></pre>

    <h3>Session Handling</h3>
    <ul>
        <li>Supports both HTTP-only cookies and Authorization header for JWT</li>
        <li>CORS configured to allow credentials</li>
        <li>Implements token refresh mechanism</li>
    </ul>

    <h3>Security Requirements</h3>
    <ul>
        <li>HTTPS enabled</li>
        <li>CORS properly configured</li>
        <li>Rate limiting implemented</li>
        <li>Input validation</li>
        <li>Secure password hashing</li>
    </ul>

    <h3>Environment Variables</h3>
    <pre><code>GOOGLE_CLIENT_ID=
JWT_SECRET=
COOKIE_SECRET=
ALLOWED_ORIGINS=</code></pre>

    <h2>Appraisal Workflow</h2>

    <h3>Step 1: Set Appraisal Value</h3>
    <div class="endpoint">
        <p><strong>Endpoint:</strong> <code>POST /api/appraisals/${id}/set-value</code></p>
        <p><strong>Purpose:</strong> Sets the initial appraisal value and description</p>
        <p><strong>Payload:</strong></p>
        <pre><code>{
  "appraisalValue": number,
  "description": "string"
}</code></pre>
    </div>

    <h3>Step 2: Merge Descriptions</h3>
    <div class="endpoint">
        <p><strong>Endpoint:</strong> <code>POST /api/appraisals/${id}/merge-descriptions</code></p>
        <p><strong>Purpose:</strong> Combines multiple descriptions or updates existing description</p>
        <p><strong>Payload:</strong></p>
        <pre><code>{
  "description": "string"
}</code></pre>
    </div>

    <h3>Step 3: Update Post Title</h3>
    <div class="endpoint">
        <p><strong>Endpoint:</strong> <code>POST /api/appraisals/${id}/update-title</code></p>
        <p><strong>Purpose:</strong> Updates the title of the appraisal post</p>
        <p><strong>Payload:</strong></p>
        <pre><code>{
  "title": "Appraisal #${id}"
}</code></pre>
    </div>

    <h3>Step 4: Insert Template</h3>
    <div class="endpoint">
        <p><strong>Endpoint:</strong> <code>POST /api/appraisals/${id}/insert-template</code></p>
        <p><strong>Purpose:</strong> Inserts the standard appraisal template into the document</p>
        <p><strong>Payload:</strong> None</p>
    </div>

    <h3>Step 5: Build PDF</h3>
    <div class="endpoint">
        <p><strong>Endpoint:</strong> <code>POST /api/appraisals/${id}/build-pdf</code></p>
        <p><strong>Purpose:</strong> Generates the PDF document for the appraisal</p>
        <p><strong>Payload:</strong> None</p>
    </div>

    <h3>Step 6: Send Email</h3>
    <div class="endpoint">
        <p><strong>Endpoint:</strong> <code>POST /api/appraisals/${id}/send-email</code></p>
        <p><strong>Purpose:</strong> Sends notification email to the customer with the appraisal details</p>
        <p><strong>Payload:</strong> None</p>
    </div>

    <h3>Step 7: Complete Appraisal</h3>
    <div class="endpoint">
        <p><strong>Endpoint:</strong> <code>POST /api/appraisals/${id}/complete</code></p>
        <p><strong>Purpose:</strong> Marks the appraisal as complete and finalizes all data</p>
        <p><strong>Payload:</strong></p>
        <pre><code>{
  "appraisalValue": number,
  "description": "string"
}</code></pre>
    </div>

    <h3>Workflow Requirements</h3>
    <ul>
        <li>All endpoints require JWT authentication</li>
        <li>Steps must be executed sequentially</li>
        <li>Each step must complete successfully before proceeding to the next</li>
        <li>Failed requests are retried up to 3 times with exponential backoff</li>
        <li>Failed operations are moved to DLQ for manual review</li>
        <li>All operations maintain transaction consistency</li>
        <li>Final completion only succeeds if all previous steps completed successfully</li>
    </ul>

    <h3>Response Format</h3>
    <pre><code>{
  "success": boolean,
  "message": "string",
  "data": {} // Optional response data
}</code></pre>

    <h2>Pending Appraisals</h2>
    
    <h3>List All Pending Appraisals</h3>
    <pre><code>GET /api/appraisals</code></pre>

    <h4>Response Format</h4>
    <pre><code>[
  {
    "id": "unique_id",
    "date": "ISO date string",
    "appraisalType": "string",
    "identifier": "session_id",
    "status": "pending",
    "iaDescription": "AI-generated description",
    "wordpressUrl": "URL to WordPress post"
  }
]</code></pre>

    <h3>Get Appraisal Details</h3>
    <pre><code>GET /api/appraisals/:id/list</code></pre>

    <h4>Parameters</h4>
    <ul>
        <li><code>id</code> - Appraisal ID (URL parameter)</li>
    </ul>

    <h4>Response Format</h4>
    <pre><code>{
  "customerDescription": "string",
  "iaDescription": "string",
  "images": {
    "main": "string (URL)",
    "age": "string (URL)",
    "signature": "string (URL)"
  }
}</code></pre>

    <h3>Complete Appraisal</h3>
    <pre><code>POST /api/tasks</code></pre>

    <h4>Request Body</h4>
    <pre><code>{
  "appraisalId": "string",
  "appraisalValue": number,
  "description": "string"
}</code></pre>

    <h4>Response Format</h4>
    <pre><code>{
  "success": boolean,
  "message": "string"
}</code></pre>

    <h3>Authentication</h3>
    <ul>
        <li>All endpoints require authentication via:
            <ul>
                <li>HTTP-only cookie (<code>jwtToken</code>)</li>
                <li>Authorization header (<code>Bearer &lt;token&gt;</code>)</li>
            </ul>
        </li>
        <li>Returns 401 if unauthorized</li>
    </ul>

    <h3>Response Codes</h3>
    <ul>
        <li><code>200 OK</code> - Request successful</li>
        <li><code>400 Bad Request</code> - Invalid input</li>
        <li><code>401 Unauthorized</code> - Invalid or missing authentication</li>
        <li><code>403 Forbidden</code> - Valid authentication but insufficient permissions</li>
        <li><code>404 Not Found</code> - Resource not found</li>
        <li><code>500 Internal Server Error</code> - Server-side error</li>
    </ul>

    <h2>Contributing</h2>
    <p>Contributions are welcome! Please follow these steps:</p>
    <ol>
        <li><strong>Fork the Repository</strong></li>
        <li><strong>Create a New Branch</strong>
            <pre><code>git checkout -b feature/YourFeatureName</code></pre>
        </li>
        <li><strong>Commit Your Changes</strong>
            <pre><code>git commit -m "Add your message here"</code></pre>
        </li>
        <li><strong>Push to the Branch</strong>
            <pre><code>git push origin feature/YourFeatureName</code></pre>
        </li>
        <li><strong>Create a Pull Request</strong></li>
    </ol>

    <h2>License</h2>
    <p>This project is licensed under the MIT License.</p>

</body>
</html>