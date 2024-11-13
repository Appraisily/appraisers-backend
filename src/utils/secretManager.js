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
  // In development, use environment variables directly
  if (process.env.NODE_ENV === 'development') {
    const envVar = secretToEnvMap[secretName];
    const value = process.env[envVar];
    
    if (!value) {
      console.warn(`Environment variable ${envVar} not found, using default development value`);
      // Return development defaults
      return getDefaultDevValue(secretName);
    }
    return value;
  }

  // In production, use Secret Manager
  try {
    const client = new SecretManagerServiceClient();
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    
    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required in production');
    }

    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
    const [version] = await client.accessSecretVersion({ name });
    return version.payload.data.toString('utf8');
  } catch (error) {
    console.error(`Error getting secret ${secretName}:`, error);
    throw error;
  }
}

// Development default values
function getDefaultDevValue(secretName) {
  const defaults = {
    'jwt-secret': 'development_jwt_secret_123',
    'WORDPRESS_API_URL': 'https://resources.appraisily.com/wp-json/wp/v2',
    'wp_username': 'development_user',
    'wp_app_password': 'development_password',
    'SENDGRID_API_KEY': 'development_sendgrid_key',
    'SENDGRID_EMAIL': 'development@example.com',
    'SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED': 'template_id_1',
    'SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE': 'template_id_2',
    'PENDING_APPRAISALS_SPREADSHEET_ID': 'spreadsheet_id',
    'GOOGLE_SHEET_NAME': 'Sheet1',
    'GOOGLE_CLOUD_PROJECT_ID': 'development-project-id',
    'OPENAI_API_KEY': 'development_openai_key',
    'SHARED_SECRET': 'development_shared_secret'
  };

  return defaults[secretName] || '';
}

module.exports = { getSecret };