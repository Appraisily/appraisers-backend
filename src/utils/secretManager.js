const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

// Mapping of secret names to environment variables
const secretToEnvMap = {
  'jwt-secret': 'JWT_SECRET',
  'WORDPRESS_API_URL': 'WORDPRESS_API_URL',
  'wp_username': 'WORDPRESS_USERNAME',
  'wp_app_password': 'WORDPRESS_APP_PASSWORD',
  'SENDGRID_API_KEY': 'SENDGRID_API_KEY',
  'SENDGRID_EMAIL': 'SENDGRID_EMAIL',
  'SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED': 'SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED',
  'SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE': 'SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE',
  'PENDING_APPRAISALS_SPREADSHEET_ID': 'PENDING_APPRAISALS_SPREADSHEET_ID',
  'GOOGLE_SHEET_NAME': 'GOOGLE_SHEET_NAME',
  'GOOGLE_CLOUD_PROJECT_ID': 'GOOGLE_CLOUD_PROJECT_ID',
  'OPENAI_API_KEY': 'OPENAI_API_KEY',
  'SHARED_SECRET': 'SHARED_SECRET'
};

async function getSecret(secretName) {
  // Use environment variables in development mode
  if (process.env.NODE_ENV === 'development') {
    const envVar = secretToEnvMap[secretName];
    const value = process.env[envVar];
    
    if (!value) {
      throw new Error(`Environment variable ${envVar} not found`);
    }
    
    return value;
  }

  // Use Google Secret Manager in production
  try {
    const client = new SecretManagerServiceClient();
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    
    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required');
    }

    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
    const [version] = await client.accessSecretVersion({ name });
    return version.payload.data.toString('utf8');
  } catch (error) {
    console.error(`Error getting secret ${secretName}:`, error);
    throw error;
  }
}

module.exports = { getSecret };