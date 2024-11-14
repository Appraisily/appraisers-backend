const { getSecret } = require('../utils/secretManager');

const config = {};

async function initializeConfig() {
  try {
    console.log('Initializing configuration...');

    config.GOOGLE_CLOUD_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
    if (!config.GOOGLE_CLOUD_PROJECT_ID) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required');
    }

    // Get secrets
    config.JWT_SECRET = await getSecret('jwt-secret');
    config.WORDPRESS_API_URL = (await getSecret('WORDPRESS_API_URL')).trim();
    config.WORDPRESS_USERNAME = (await getSecret('wp_username')).trim();
    config.WORDPRESS_APP_PASSWORD = (await getSecret('wp_app_password')).trim();
    config.SENDGRID_API_KEY = (await getSecret('SENDGRID_API_KEY')).trim();
    config.SENDGRID_EMAIL = (await getSecret('SENDGRID_EMAIL')).trim();
    config.SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED = (await getSecret('SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED')).trim();
    config.PENDING_APPRAISALS_SPREADSHEET_ID = (await getSecret('PENDING_APPRAISALS_SPREADSHEET_ID')).trim();
    config.GOOGLE_SHEET_NAME = (await getSecret('GOOGLE_SHEET_NAME')).trim();
    config.OPENAI_API_KEY = (await getSecret('OPENAI_API_KEY')).trim();

    console.log('Configuration initialized successfully');
    return config;
  } catch (error) {
    console.error('Error initializing configuration:', error);
    throw error;
  }
}

module.exports = { config, initializeConfig };