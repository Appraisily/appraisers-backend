const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

// Local development secrets
const localSecrets = {
  'jwt-secret': 'dev-jwt-secret-key',
  'SHARED_SECRET': 'dev-shared-secret',
  'WORDPRESS_API_URL': 'https://resources.appraisily.com/wp-json/wp/v2',
  'wp_username': 'dev_user',
  'wp_app_password': 'dev_password',
  'SENDGRID_API_KEY': 'SG.dev_key',
  'SENDGRID_EMAIL': 'dev@appraisily.com',
  'SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED': 'template_id_1',
  'SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE': 'template_id_2',
  'PENDING_APPRAISALS_SPREADSHEET_ID': 'spreadsheet_id',
  'GOOGLE_SHEET_NAME': 'Sheet1',
  'LOG_SPREADSHEET_ID': 'log_spreadsheet_id',
  'EDIT_SHEET_NAME': 'Edit',
  'OPENAI_API_KEY': 'sk-dev_key',
  'GOOGLE_CLOUD_PROJECT_ID': 'dev-project'
};

const client = new SecretManagerServiceClient();

async function getSecret(secretName) {
  try {
    // Check if running in development environment
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Using local secret for: ${secretName}`);
      return localSecrets[secretName] || '';
    }

    const projectId = await client.getProjectId();
    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

    const [version] = await client.accessSecretVersion({ name });
    const payload = version.payload.data.toString('utf8');
    return payload;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`Using fallback value for ${secretName}`);
      return localSecrets[secretName] || '';
    }
    console.error(`Error getting secret ${secretName}:`, error);
    throw new Error(`Could not get secret ${secretName}`);
  }
}

module.exports = { getSecret };