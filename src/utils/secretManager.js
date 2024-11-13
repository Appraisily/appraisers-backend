const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
require('dotenv').config();

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
  // Always check environment variables first
  const envVar = secretToEnvMap[secretName];
  const envValue = process.env[envVar];
  
  if (envValue) {
    return envValue;
  }

  // If no environment variable and we're in development, throw error
  if (process.env.NODE_ENV === 'development') {
    throw new Error(`Environment variable ${envVar} not found`);
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