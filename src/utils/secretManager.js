const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

// Mock secrets for development
const mockSecrets = {
  'jwt-secret': 'dev-jwt-secret-key',
  'SHARED_SECRET': 'dev-shared-secret',
  'WORDPRESS_API_URL': 'https://resources.appraisily.com/wp-json/wp/v2',
  'wp_username': 'dev_user',
  'wp_app_password': 'dev_password',
  'SENDGRID_API_KEY': 'SG.dev_key',
  'SENDGRID_EMAIL': 'dev@appraisily.com',
  'SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED': 'template_id_1',
  'SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE': 'template_id_2',
  'PENDING_APPRAISALS_SPREADSHEET_ID': '1234567890',
  'GOOGLE_SHEET_NAME': 'Sheet1',
  'LOG_SPREADSHEET_ID': 'log_spreadsheet_id',
  'EDIT_SHEET_NAME': 'Edit',
  'OPENAI_API_KEY': 'sk-dev_key',
  'GOOGLE_CLOUD_PROJECT_ID': 'dev-project',
  'service-account-json': JSON.stringify({
    "type": "service_account",
    "project_id": "mock-project",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMOCK_KEY\n-----END PRIVATE KEY-----\n",
    "client_email": "mock@example.com",
    "client_id": "mock_client_id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/mock"
  })
};

const client = new SecretManagerServiceClient();

async function getSecret(secretName) {
  try {
    // Use mock secrets in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Using mock secret for: ${secretName}`);
      return mockSecrets[secretName] || '';
    }

    const projectId = await client.getProjectId();
    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

    const [version] = await client.accessSecretVersion({ name });
    return version.payload.data.toString('utf8');
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`Using fallback mock value for ${secretName}`);
      return mockSecrets[secretName] || '';
    }
    console.error(`Error getting secret ${secretName}:`, error);
    throw new Error(`Could not get secret ${secretName}`);
  }
}

module.exports = { getSecret };