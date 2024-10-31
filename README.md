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
└── README.md
</code></pre>

    <h3>Description of Key Directories and Files</h3>

    <ul>
        <li><strong>controllers/</strong>: Contains the logic for handling various API requests related to appraisals.
            <ul>
                <li><code>appraisalController.js</code>: Manages endpoints for retrieving and updating appraisals.</li>
                <li><code>updatePendingAppraisalController.js</code>: Handles the process of updating pending appraisals, including interactions with OpenAI, WordPress, Google Sheets, and SendGrid.</li>
            </ul>
        </li>
        <li><strong>middleware/</strong>: Contains middleware functions.
            <ul>
                <li><code>authenticate.js</code>: Middleware for verifying JWT tokens and authorizing users.</li>
            </ul>
        </li>
        <li><strong>routes/</strong>: Defines the API routes and maps them to corresponding controllers.
            <ul>
                <li><code>appraisals.js</code>: Routes related to appraisal operations.</li>
            </ul>
        </li>
        <li><strong>shared/</strong>: Shared modules and configurations.
            <ul>
                <li><code>appraisalSteps.js</code>: Contains shared functions for appraisal processes.</li>
                <li><code>config.js</code>: Manages configuration and environment variables.</li>
                <li><code>googleSheets.js</code>: Initializes and exports the Google Sheets API client.</li>
                <li><code>secretManager.js</code>: Handles retrieval of secrets from Google Cloud Secret Manager.</li>
            </ul>
        </li>
        <li><strong>utils/</strong>: Utility functions and middlewares.
            <ul>
                <li><code>getImageUrl.js</code>: Fetches image URLs from WordPress media.</li>
                <li><code>validateSetValueData.js</code>: Validates request data for setting appraisal values.</li>
            </ul>
        </li>
        <li><strong>.env</strong>: Environment variables (should be kept secure and not committed to version control).</li>
        <li><strong>index.js</strong>: Entry point of the application. Initializes configurations, middleware, and starts the server.</li>
        <li><strong>package.json</strong>: Project dependencies and scripts.</li>
    </ul>

    <h2 id="setup-and-installation">Setup and Installation</h2>

    <h3 id="clone-the-repository">Clone the Repository</h3>
    <pre><code>git clone https://github.com/tu-usuario/appraisal-management-backend.git
cd appraisal-management-backend
</code></pre>

    <h3 id="install-dependencies">Install Dependencies</h3>
    <p>Ensure you have Node.js installed (preferably version 14 or higher).</p>
    <pre><code>npm install
</code></pre>

    <h3 id="configure-environment-variables">Configure Environment Variables</h3>
    <p>Create a <code>.env</code> file in the root directory and populate it with the necessary variables:</p>
    <pre><code>PORT=8080
JWT_SECRET=your_jwt_secret
SHARED_SECRET=your_shared_secret
SPREADSHEET_ID=your_google_sheets_id
SHEET_NAME=Pending Appraisals
PENDING_APPRAISALS_SPREADSHEET_ID=your_pending_appraisals_sheets_id
GOOGLE_SHEET_NAME=Appraisals
OPENAI_API_KEY=your_openai_api_key
WORDPRESS_API_URL=https://www.yourwordpresssite.com/wp-json/wp/v2
WORDPRESS_USERNAME=your_wordpress_username
WORDPRESS_APP_PASSWORD=your_wordpress_app_password
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_EMAIL=your_verified_sendgrid_email
SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE=your_sendgrid_template_id
GCP_PROJECT_ID=your_google_cloud_project_id
</code></pre>
    <p><strong>Note</strong>: Ensure that sensitive information like API keys and secrets are kept secure and not exposed publicly.</p>

    <h3 id="run-the-server">Run the Server</h3>
    <pre><code>npm start
</code></pre>
    <p>The server should now be running on <a href="http://localhost:8080">http://localhost:8080</a>.</p>

    <h2 id="configuration">Configuration</h2>
    <p>All configurations are managed through the <code>shared/config.js</code> file, which loads environment variables from the <code>.env</code> file. Ensure all necessary variables are correctly set to enable seamless integration with Google Sheets, WordPress, OpenAI, and SendGrid.</p>

    <h2 id="api-endpoints">API Endpoints</h2>

    <h3 id="authentication">Authentication</h3>

    <h4 id="1-authenticate-user">1. Authenticate User</h4>
    <ul>
        <li><strong>URL</strong>: <code>/api/authenticate</code></li>
        <li><strong>Method</strong>: <code>POST</code></li>
        <li><strong>Description</strong>: Authenticates a user using an ID token and sets a JWT cookie.</li>
        <li><strong>Headers</strong>: <code>Content-Type: application/json</code></li>
        <li><strong>Body Parameters</strong>:
            <ul>
                <li><code>idToken</code> (string, required): The ID token obtained from the client.</li>
            </ul>
        </li>
        <li><strong>Responses</strong>:
            <ul>
                <li><code>200 OK</code>: Authentication successful. Sets a JWT cookie and returns the user's name.</li>
                <li><code>400 Bad Request</code>: Missing <code>idToken</code>.</li>
                <li><code>401 Unauthorized</code>: Invalid ID token or authentication failed.</li>
                <li><code>403 Forbidden</code>: User not authorized.</li>
            </ul>
        </li>
    </ul>

    <h4 id="2-logout-user">2. Logout User</h4>
    <ul>
        <li><strong>URL</strong>: <code>/api/logout</code></li>
        <li><strong>Method</strong>: <code>POST</code></li>
        <li><strong>Description</strong>: Logs out the user by clearing the JWT cookie.</li>
        <li><strong>Responses</strong>:
            <ul>
                <li><code>200 OK</code>: Logout successful.</li>
            </ul>
        </li>
    </ul>

    <h4 id="3-check-authentication-status">3. Check Authentication Status</h4>
    <ul>
        <li><strong>URL</strong>: <code>/api/check-auth</code></li>
        <li><strong>Method</strong>: <code>GET</code></li>
        <li><strong>Description</strong>: Checks if the user is authenticated.</li>
        <li><strong>Responses</strong>:
            <ul>
                <li><code>200 OK</code>: Returns authentication status and user's name.</li>
                <li><code>401 Unauthorized</code>: User not authenticated.</li>
            </ul>
        </li>
    </ul>

    <h3 id="appraisals">Appraisals</h3>
    <p>All appraisal-related endpoints require authentication via JWT.</p>

    <h4 id="1-get-all-pending-appraisals">1. Get All Pending Appraisals</h4>
    <ul>
        <li><strong>URL</strong>: <code>/api/appraisals</code></li>
        <li><strong>Method</strong>: <code>GET</code></li>
        <li><strong>Description</strong>: Retrieves a list of all pending appraisals from Google Sheets.</li>
        <li><strong>Responses</strong>:
            <ul>
                <li><code>200 OK</code>: Returns an array of pending appraisals.</li>
                <li><code>500 Internal Server Error</code>: Error fetching appraisals.</li>
            </ul>
        </li>
    </ul>

    <h4 id="2-get-appraisal-details-for-edit">2. Get Appraisal Details for Edit</h4>
    <ul>
        <li><strong>URL</strong>: <code>/api/appraisals/:id/list-edit</code></li>
        <li><strong>Method</strong>: <code>GET</code></li>
        <li><strong>Description</strong>: Retrieves detailed information of a specific appraisal for editing, including data from WordPress.</li>
        <li><strong>URL Parameters</strong>:
            <ul>
                <li><code>id</code> (string, required): The row number in Google Sheets representing the appraisal.</li>
            </ul>
        </li>
        <li><strong>Responses</strong>:
            <ul>
                <li><code>200 OK</code>: Returns detailed appraisal data.</li>
                <li><code>400 Bad Request</code>: Invalid WordPress URL or missing post ID.</li>
                <li><code>404 Not Found</code>: Appraisal not found.</li>
                <li><code>500 Internal Server Error</code>: Error fetching details.</li>
            </ul>
        </li>
    </ul>

    <h4 id="3-get-specific-appraisal-details">3. Get Specific Appraisal Details</h4>
    <ul>
        <li><strong>URL</strong>: <code>/api/appraisals/:id/list</code></li>
        <li><strong>Method</strong>: <code>GET</code></li>
        <li><strong>Description</strong>: Retrieves detailed information of a specific appraisal.</li>
        <li><strong>URL Parameters</strong>:
            <ul>
                <li><code>id</code> (string, required): The row number in Google Sheets representing the appraisal.</li>
            </ul>
        </li>
        <li><strong>Responses</strong>:
            <ul>
                <li><code>200 OK</code>: Returns detailed appraisal data.</li>
                <li><code>400 Bad Request</code>: Invalid WordPress post ID.</li>
                <li><code>404 Not Found</code>: Appraisal not found.</li>
                <li><code>500 Internal Server Error</code>: Error fetching details.</li>
            </ul>
        </li>
    </ul>

    <h4 id="4-update-acf-field">4. Update ACF Field</h4>
    <ul>
        <li><strong>URL</strong>: <code>/api/appraisals/:id/update-acf-field</code></li>
        <li><strong>Method</strong>: <code>PUT</code></li>
        <li><strong>Description</strong>: Updates a specific Advanced Custom Field (ACF) in a WordPress post.</li>
        <li><strong>URL Parameters</strong>:
            <ul>
                <li><code>id</code> (string, required): The WordPress post ID.</li>
            </ul>
        </li>
        <li><strong>Body Parameters</strong>:
            <ul>
                <li><code>fieldName</code> (string, required): The name of the ACF field to update.</li>
                <li><code>fieldValue</code> (any, required): The new value for the ACF field.</li>
            </ul>
        </li>
        <li><strong>Responses</strong>:
            <ul>
                <li><code>200 OK</code>: Field updated successfully.</li>
                <li><code>400 Bad Request</code>: Missing <code>fieldName</code>.</li>
                <li><code>500 Internal Server Error</code>: Error updating the field.</li>
            </ul>
        </li>
    </ul>

    <h4 id="5-set-appraisal-value-and-description">5. Set Appraisal Value and Description</h4>
    <ul>
        <li><strong>URL</strong>: <code>/api/appraisals/:id/set-value</code></li>
        <li><strong>Method</strong>: <code>POST</code></li>
        <li><strong>Description</strong>: Updates the appraisal value and description in Google Sheets and WordPress.</li>
        <li><strong>URL Parameters</strong>:
            <ul>
                <li><code>id</code> (string, required): The row number in Google Sheets representing the appraisal.</li>
            </ul>
        </li>
        <li><strong>Body Parameters</strong>:
            <ul>
                <li><code>appraisalValue</code> (number, required): The value of the appraisal.</li>
                <li><code>description</code> (string, required): The description of the appraisal.</li>
                <li><code>isEdit</code> (boolean, optional): Flag indicating if the update is for editing purposes.</li>
            </ul>
        </li>
        <li><strong>Responses</strong>:
            <ul>
                <li><code>200 OK</code>: Appraisal updated successfully.</li>
                <li><code>400 Bad Request</code>: Missing required fields.</li>
                <li><code>500 Internal Server Error</code>: Error updating the appraisal.</li>
            </ul>
        </li>
    </ul>

    <h4 id="6-complete-appraisal-process">6. Complete Appraisal Process</h4>
    <ul>
        <li><strong>URL</strong>: <code>/api/appraisals/:id/complete-process</code></li>
        <li><strong>Method</strong>: <code>POST</code></li>
        <li><strong>Description</strong>: Completes the appraisal process by enqueuing tasks in Pub/Sub.</li>
        <li><strong>URL Parameters</strong>:
            <ul>
                <li><code>id</code> (string, required): The row number in Google Sheets representing the appraisal.</li>
            </ul>
        </li>
        <li><strong>Body Parameters</strong>:
            <ul>
                <li><code>appraisalValue</code> (number, required): The value of the appraisal.</li>
                <li><code>description</code> (string, required): The description of the appraisal.</li>
            </ul>
        </li>
        <li><strong>Responses</strong>:
            <ul>
                <li><code>200 OK</code>: Appraisal submitted successfully.</li>
                <li><code>400 Bad Request</code>: Missing required fields.</li>
                <li><code>500 Internal Server Error</code>: Error submitting appraisal.</li>
            </ul>
        </li>
    </ul>

    <h4 id="7-get-session-id">7. Get Session ID</h4>
    <ul>
        <li><strong>URL</strong>: <code>/api/appraisals/get-session-id</code></li>
        <li><strong>Method</strong>: <code>POST</code></li>
        <li><strong>Description</strong>: Retrieves the <code>session_id</code> from a WordPress post using the <code>postId</code>.</li>
        <li><strong>Body Parameters</strong>:
            <ul>
                <li><code>postId</code> (string, required): The WordPress post ID.</li>
            </ul>
        </li>
        <li><strong>Responses</strong>:
            <ul>
                <li><code>200 OK</code>: Returns the <code>session_ID</code>.</li>
                <li><code>400 Bad Request</code>: Missing <code>postId</code>.</li>
                <li><code>404 Not Found</code>: <code>session_ID</code> not found.</li>
                <li><code>500 Internal Server Error</code>: Error fetching <code>session_ID</code>.</li>
            </ul>
        </li>
    </ul>

    <h4 id="8-save-pdf-and-doc-links">8. Save PDF and Doc Links</h4>
    <ul>
        <li><strong>URL</strong>: <code>/api/appraisals/:id/save-links</code></li>
        <li><strong>Method</strong>: <code>POST</code></li>
        <li><strong>Description</strong>: Saves PDF and Doc links in Google Sheets for a specific appraisal.</li>
        <li><strong>URL Parameters</strong>:
            <ul>
                <li><code>id</code> (string, required): The row number in Google Sheets representing the appraisal.</li>
            </ul>
        </li>
        <li><strong>Body Parameters</strong>:
            <ul>
                <li><code>pdfLink</code> (string, required): URL to the generated PDF.</li>
                <li><code>docLink</code> (string, required): URL to the generated Doc.</li>
            </ul>
        </li>
        <li><strong>Responses</strong>:
            <ul>
                <li><code>200 OK</code>: Links saved successfully.</li>
                <li><code>400 Bad Request</code>: Missing <code>pdfLink</code> or <code>docLink</code>.</li>
                <li><code>500 Internal Server Error</code>: Error saving links.</li>
            </ul>
        </li>
    </ul>

    <h4 id="9-get-completed-appraisals">9. Get Completed Appraisals</h4>
    <ul>
        <li><strong>URL</strong>: <code>/api/appraisals/completed</code></li>
        <li><strong>Method</strong>: <code>GET</code></li>
        <li><strong>Description</strong>: Retrieves a list of all completed appraisals from Google Sheets.</li>
        <li><strong>Responses</strong>:
            <ul>
                <li><code>200 OK</code>: Returns an array of completed appraisals.</li>
                <li><code>500 Internal Server Error</code>: Error fetching completed appraisals.</li>
            </ul>
        </li>
    </ul>

    <h4 id="10-insert-template-in-wordpress-post">10. Insert Template in WordPress Post</h4>
    <ul>
        <li><strong>URL</strong>: <code>/api/appraisals/:id/insert-template</code></li>
        <li><strong>Method</strong>: <code>POST</code></li>
        <li><strong>Description</strong>: Inserts predefined templates or shortcodes into a WordPress post.</li>
        <li><strong>URL Parameters</strong>:
            <ul>
                <li><code>id</code> (string, required): The row number in Google Sheets representing the appraisal.</li>
            </ul>
        </li>
        <li><strong>Responses</strong>:
            <ul>
                <li><code>200 OK</code>: Template inserted successfully.</li>
                <li><code>500 Internal Server Error</code>: Error inserting template.</li>
            </ul>
        </li>
    </ul>

    <h4 id="11-update-wordpress-post-title">11. Update WordPress Post Title</h4>
    <ul>
        <li><strong>URL</strong>: <code>/api/appraisals/:id/update-title</code></li>
        <li><strong>Method</strong>: <code>POST</code></li>
        <li><strong>Description</strong>: Updates the title of a WordPress post based on AI-generated descriptions.</li>
        <li><strong>URL Parameters</strong>:
            <ul>
                <li><code>id</code> (string, required): The row number in Google Sheets representing the appraisal.</li>
            </ul>
        </li>
        <li><strong>Responses</strong>:
            <ul>
                <li><code>200 OK</code>: Post title updated successfully.</li>
                <li><code>500 Internal Server Error</code>: Error updating post title.</li>
            </ul>
        </li>
    </ul>

    <h4 id="12-send-email-to-customer">12. Send Email to Customer</h4>
    <ul>
        <li><strong>URL</strong>: <code>/api/appraisals/:id/send-email</code></li>
        <li><strong>Method</strong>: <code>POST</code></li>
        <li><strong>Description</strong>: Sends an email notification to the customer with appraisal details.</li>
        <li><strong>URL Parameters</strong>:
            <ul>
                <li><code>id</code> (string, required): The row number in Google Sheets representing the appraisal.</li>
            </ul>
        </li>
        <li><strong>Responses</strong>:
            <ul>
                <li><code>200 OK</code>: Email sent successfully.</li>
                <li><code>500 Internal Server Error</code>: Error sending email.</li>
            </ul>
        </li>
    </ul>

    <h4 id="13-update-pdf-and-doc-links-from-wordpress">13. Update PDF and Doc Links from WordPress</h4>
    <ul>
        <li><strong>URL</strong>: <code>/api/appraisals/:id/update-links</code></li>
        <li><strong>Method</strong>: <code>POST</code></li>
        <li><strong>Description</strong>: Updates the PDF and Doc links in Google Sheets based on data from WordPress.</li>
        <li><strong>URL Parameters</strong>:
            <ul>
                <li><code>id</code> (string, required): The row number in Google Sheets representing the appraisal.</li>
            </ul>
        </li>
        <li><strong>Body Parameters</strong>:
            <ul>
                <li><code>postId</code> (string, required): The WordPress post ID.</li>
            </ul>
        </li>
        <li><strong>Responses</strong>:
            <ul>
                <li><code>200 OK</code>: Links updated successfully.</li>
                <li><code>400 Bad Request</code>: Missing <code>postId</code>.</li>
                <li><code>500 Internal Server Error</code>: Error updating links.</li>
            </ul>
        </li>
    </ul>

    <h4 id="14-complete-appraisal">14. Complete Appraisal</h4>
    <ul>
        <li><strong>URL</strong>: <code>/api/appraisals/:id/complete</code></li>
        <li><strong>Method</strong>: <code>POST</code></li>
        <li><strong>Description</strong>: Marks an appraisal as completed in Google Sheets and performs necessary cleanup.</li>
        <li><strong>URL Parameters</strong>:
            <ul>
                <li><code>id</code> (string, required): The row number in Google Sheets representing the appraisal.</li>
            </ul>
        </li>
        <li><strong>Body Parameters</strong>:
            <ul>
                <li><code>appraisalValue</code> (number, required): The value of the appraisal.</li>
                <li><code>description</code> (string, required): The description of the appraisal.</li>
            </ul>
        </li>
        <li><strong>Responses</strong>:
            <ul>
                <li><code>200 OK</code>: Appraisal completed successfully.</li>
                <li><code>400 Bad Request</code>: Missing required fields.</li>
                <li><code>500 Internal Server Error</code>: Error completing appraisal.</li>
            </ul>
        </li>
    </ul>

    <h3 id="update-pending-appraisal">Update Pending Appraisal</h3>
    <h4 id="15-update-pending-appraisal">15. Update Pending Appraisal</h4>
    <ul>
        <li><strong>URL</strong>: <code>/api/update-pending-appraisal</code></li>
        <li><strong>Method</strong>: <code>POST</code></li>
        <li><strong>Description</strong>: Updates the status of a pending appraisal, generates AI descriptions, updates WordPress and Google Sheets, and sends email notifications.</li>
        <li><strong>Headers</strong>:
            <ul>
                <li><code>x-shared-secret</code> (string, required): Shared secret for authentication.</li>
            </ul>
        </li>
        <li><strong>Body Parameters</strong>:
            <ul>
                <li><code>description</code> (string, required): Customer-provided description.</li>
                <li><code>images</code> (object, required): URLs of images (<code>main</code>, <code>signature</code>, <code>back</code>).</li>
                <li><code>post_id</code> (string, required): WordPress post ID.</li>
                <li><code>post_edit_url</code> (string, required): URL to edit the WordPress post.</li>
                <li><code>customer_email</code> (string, required): Customer's email address.</li>
                <li><code>session_id</code> (string, required): Session ID for Google Sheets lookup.</li>
            </ul>
        </li>
        <li><strong>Responses</strong>:
            <ul>
                <li><code>200 OK</code>: Appraisal status updated successfully.</li>
                <li><code>400 Bad Request</code>: Missing required fields.</li>
                <li><code>403 Forbidden</code>: Invalid shared secret.</li>
                <li><code>500 Internal Server Error</code>: Internal server error.</li>
            </ul>
        </li>
    </ul>

    <h2 id="usage">Usage</h2>
    <p>Once the server is running, you can interact with the API endpoints using tools like [Postman](https://www.postman.com/) or via your frontend application. Ensure that you include the necessary authentication tokens and headers as required by each endpoint.</p>

    <h3>Example Workflow</h3>
    <ol>
        <li><strong>Authenticate User</strong>: Obtain a JWT by sending a valid ID token to <code>/api/authenticate</code>.</li>
        <li><strong>Fetch Pending Appraisals</strong>: Retrieve all pending appraisals using <code>/api/appraisals</code>.</li>
        <li><strong>Update Pending Appraisal</strong>: Use <code>/api/update-pending-appraisal</code> to update the status, generate descriptions, and trigger further actions.</li>
        <li><strong>Complete Appraisal</strong>: Mark an appraisal as completed using <code>/api/appraisals/:id/complete</code>.</li>
    </ol>

    <h2 id="contributing">Contributing</h2>
    <p>Contributions are welcome! Please follow these steps:</p>
    <ol>
        <li><strong>Fork the Repository</strong></li>
        <li><strong>Create a New Branch</strong>
            <pre><code>git checkout -b feature/YourFeatureName
</code></pre>
        </li>
        <li><strong>Commit Your Changes</strong>
            <pre><code>git commit -m "Add your message here"
</code></pre>
        </li>
        <li><strong>Push to the Branch</strong>
            <pre><code>git push origin feature/YourFeatureName
</code></pre>
        </li>
        <li><strong>Create a Pull Request</strong></li>
        <li>Provide a clear description of your changes and ensure that all tests pass before submitting.</li>
    </ol>

    <h2 id="license">License</h2>
    <p>This project is licensed under the <a href="LICENSE">MIT License</a>.</p>

    <hr>

    <h2>Additional Notes</h2>
    <ul>
        <li><strong>Security</strong>: Ensure that all sensitive information, such as API keys and secrets, are securely stored and not exposed in the codebase.</li>
        <li><strong>Environment Variables</strong>: Always use environment variables for configuration to keep your application flexible and secure.</li>
        <li><strong>Error Handling</strong>: The application includes comprehensive error handling to ensure robustness. Monitor logs to troubleshoot any issues that arise.</li>
        <li><strong>Scalability</strong>: The modular architecture allows for easy scalability and maintenance. Add new features by creating new controllers and routes as needed.</li>
    </ul>
    <p>If you encounter any issues or have suggestions for improvements, feel free to open an issue or submit a pull request.</p>

    <hr>

    <p><em>This README was generated to provide a comprehensive overview of the Appraisal Management Backend, its structure, and functionalities. For any further questions or clarifications, please refer to the project's documentation or contact the maintainer.</em></p>

</body>
</html>
