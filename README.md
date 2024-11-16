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
        h1, h2, h3 {
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
    </style>
</head>
<body>

    <h1>Appraisal Management Backend</h1>

    <h2>Table of Contents</h2>
    <ul>
        <li><a href="#overview">Overview</a></li>
        <li><a href="#features">Features</a></li>
        <li><a href="#technology-stack">Technology Stack</a></li>
        <li><a href="#directory-structure">Directory Structure</a></li>
        <li><a href="#setup-and-installation">Setup and Installation</a>
            <ul>
                <li><a href="#clone-the-repository">Clone the Repository</a></li>
                <li><a href="#install-dependencies">Install Dependencies</a></li>
                <li><a href="#configure-environment-variables">Configure Environment Variables</a></li>
                <li><a href="#run-the-server">Run the Server</a></li>
            </ul>
        </li>
        <li><a href="#configuration">Configuration</a></li>
        <li><a href="#authentication">Authentication</a>
            <ul>
                <li><a href="#endpoints">Endpoints</a></li>
                <li><a href="#response-format">Response Format</a></li>
                <li><a href="#session-handling">Session Handling</a></li>
                <li><a href="#security-requirements">Security Requirements</a></li>
                <li><a href="#environment-variables">Environment Variables</a></li>
            </ul>
        </li>
        <li><a href="#api-endpoints">API Endpoints</a>
            <ul>
                <li><a href="#authentication">Authentication</a>
                    <ul>
                        <li><a href="#1-authenticate-user">1. Authenticate User</a></li>
                        <li><a href="#2-logout-user">2. Logout User</a></li>
                        <li><a href="#3-check-authentication-status">3. Check Authentication Status</a></li>
                    </ul>
                </li>
                <li><a href="#appraisals">Appraisals</a>
                    <ul>
                        <li><a href="#1-get-all-pending-appraisals">1. Get All Pending Appraisals</a></li>
                        <li><a href="#2-get-appraisal-details-for-edit">2. Get Appraisal Details for Edit</a></li>
                        <li><a href="#3-get-specific-appraisal-details">3. Get Specific Appraisal Details</a></li>
                        <li><a href="#4-update-acf-field">4. Update ACF Field</a></li>
                        <li><a href="#5-set-appraisal-value-and-description">5. Set Appraisal Value and Description</a></li>
                        <li><a href="#6-complete-appraisal-process">6. Complete Appraisal Process</a></li>
                        <li><a href="#7-get-session-id">7. Get Session ID</a></li>
                        <li><a href="#8-save-pdf-and-doc-links">8. Save PDF and Doc Links</a></li>
                        <li><a href="#9-get-completed-appraisals">9. Get Completed Appraisals</a></li>
                        <li><a href="#10-insert-template-in-wordpress-post">10. Insert Template in WordPress Post</a></li>
                        <li><a href="#11-update-wordpress-post-title">11. Update WordPress Post Title</a></li>
                        <li><a href="#12-send-email-to-customer">12. Send Email to Customer</a></li>
                        <li><a href="#13-update-pdf-and-doc-links-from-wordpress">13. Update PDF and Doc Links from WordPress</a></li>
                        <li><a href="#14-complete-appraisal">14. Complete Appraisal</a></li>
                    </ul>
                </li>
                <li><a href="#update-pending-appraisal">Update Pending Appraisal</a></li>
            </ul>
        </li>
        <li><a href="#usage">Usage</a></li>
        <li><a href="#contributing">Contributing</a></li>
        <li><a href="#license">License</a></li>
    </ul>

    <h2 id="overview">Overview</h2>
    <p>The <strong>Appraisal Management Backend</strong> is a robust Node.js application built with Express.js, designed to manage appraisal processes seamlessly. It integrates with Google Sheets for data storage, WordPress for content management, OpenAI for generating descriptions, and SendGrid for email notifications. The backend handles authentication, data validation, and orchestrates various operations to ensure efficient management of appraisals.</p>

    <h2 id="authentication">Authentication</h2>

    <h3 id="endpoints">Endpoints</h3>
    <ul>
        <li><code>POST /api/auth/google</code> - Google OAuth login</li>
        <li><code>POST /api/auth/login</code> - Email/password login</li>
        <li><code>POST /api/auth/logout</code> - Logout</li>
        <li><code>POST /api/auth/refresh</code> - Refresh JWT tokens</li>
    </ul>

    <h3 id="response-format">Response Format</h3>
    <pre><code>{
  "success": true/false,
  "name": "User's name",
  "message": "Optional message"
}</code></pre>

    <h3 id="session-handling">Session Handling</h3>
    <ul>
        <li>Dual JWT storage support:
            <ul>
                <li>HTTP-only cookies for traditional web applications</li>
                <li>Bearer token in Authorization header for serverless/stateless clients</li>
            </ul>
        </li>
        <li>CORS headers configured to allow credentials</li>
        <li>Token refresh mechanism implemented</li>
        <li>Automatic token rotation for enhanced security</li>
    </ul>

    <h3 id="security-requirements">Security Requirements</h3>
    <ul>
        <li>HTTPS enabled</li>
        <li>CORS properly configured</li>
        <li>Rate limiting implemented</li>
        <li>Input validation</li>
        <li>Secure password hashing (for email/password auth)</li>
        <li>JWT signature verification</li>
        <li>Token expiration and refresh policies</li>
    </ul>

    <h3 id="environment-variables">Environment Variables</h3>
    <pre><code>GOOGLE_CLIENT_ID=your_google_client_id
JWT_SECRET=your_jwt_secret
COOKIE_SECRET=your_cookie_secret
ALLOWED_ORIGINS=https://your-frontend-domain.com
TOKEN_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d</code></pre>

    <p><strong>Note</strong>: The backend must be accessible at the URL configured in the frontend's environment variables (<code>VITE_BACKEND_URL</code>).</p>

    <h2 id="features">Features</h2>
    <ul>
        <li><strong>Authentication & Authorization</strong>: Secure access using JWT and shared secrets.</li>
        <li><strong>Google Sheets Integration</strong>: Read and update appraisal data.</li>
        <li><strong>WordPress Integration</strong>: Manage posts and custom fields via the REST API.</li>
        <li><strong>OpenAI Integration</strong>: Generate AI-based descriptions for appraisals.</li>
        <li><strong>Email Notifications</strong>: Send automated emails to customers using SendGrid.</li>
        <li><strong>Pub/Sub Messaging</strong>: Handle asynchronous tasks using Google Cloud Pub/Sub.</li>
        <li><strong>Modular Architecture</strong>: Organized file structure with separate controllers and routes for scalability and maintainability.</li>
    </ul>

    <h2 id="technology-stack">Technology Stack</h2>
    <ul>
        <li><strong>Runtime</strong>: Node.js</li>
        <li><strong>Framework</strong>: Express.js</li>
        <li><strong>APIs</strong>:
            <ul>
                <li>Google Sheets API</li>
                <li>WordPress REST API</li>
                <li>OpenAI API</li>
                <li>SendGrid API</li>
            </ul>
        </li>
        <li><strong>Authentication</strong>: JWT, OAuth2</li>
        <li><strong>Messaging</strong>: Google Cloud Pub/Sub</li>
        <li><strong>Other Libraries</strong>:
            <ul>
                <li><code>dotenv</code> for environment variables</li>
                <li><code>node-fetch</code> for HTTP requests</li>
                <li><code>@sendgrid/mail</code> for email services</li>
                <li><code>jsonwebtoken</code> for JWT handling</li>
            </ul>
        </li>
    </ul>

    <h2 id="directory-structure">Directory Structure</h2>
    <pre><code>├── controllers
│   ├── appraisalController.js
│   └── updatePendingAppraisalController.js
├── middleware
│   └── authenticate.js
├── routes
│   └── appraisals.js
├── shared
│   ├── appraisalSteps.js
│   ├── config.js
│   ├── googleSheets.js
│   └── secretManager.js
├── utils
│   ├── getImageUrl.js
│   └── validateSetValueData.js
├── .env
├── index.js
├── package.json
└── README.md</code></pre>

    <h2 id="setup-and-installation">Setup and Installation</h2>

    <h3 id="clone-the-repository">Clone the Repository</h3>
    <pre><code>git clone https://github.com/tu-usuario/appraisal-management-backend.git
cd appraisal-management-backend</code></pre>

    <h3 id="install-dependencies">Install Dependencies</h3>
    <pre><code>npm install</code></pre>

    <h3 id="configure-environment-variables">Configure Environment Variables</h3>
    <p>Create a <code>.env</code> file in the root directory with the required variables.</p>

    <h3 id="run-the-server">Run the Server</h3>
    <pre><code>npm start</code></pre>

    <h2 id="usage">Usage</h2>
    <p>Once the server is running, you can interact with the API endpoints using tools like Postman or via your frontend application.</p>

    <h2 id="contributing">Contributing</h2>
    <p>Contributions are welcome! Please follow the standard GitHub flow:</p>
    <ol>
        <li>Fork the repository</li>
        <li>Create a feature branch</li>
        <li>Commit your changes</li>
        <li>Push to your branch</li>
        <li>Create a Pull Request</li>
    </ol>

    <h2 id="license">License</h2>
    <p>This project is licensed under the MIT License.</p>

</body>
</html>