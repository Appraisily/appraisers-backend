const { getSecret } = require('../utils/secretManager');

const config = {};

async function initializeConfig() {
  try {
    console.log(`Initializing configuration in ${process.env.NODE_ENV} mode`);

    // Core configuration
    config.JWT_SECRET = await getSecret('jwt-secret');
    config.SHARED_SECRET = await getSecret('SHARED_SECRET');
    config.GOOGLE_CLOUD_PROJECT_ID = await getSecret('GOOGLE_CLOUD_PROJECT_ID');

    // WordPress configuration
    config.WORDPRESS_API_URL = (await getSecret('WORDPRESS_API_URL')).trim().replace('www.resources', 'resources');
    config.WORDPRESS_USERNAME = (await getSecret('wp_username')).trim();
    config.WORDPRESS_APP_PASSWORD = (await getSecret('wp_app_password')).trim();

    // SendGrid configuration
    config.SENDGRID_API_KEY = (await getSecret('SENDGRID_API_KEY')).trim();
    if (!config.SENDGRID_API_KEY.startsWith('SG.')) {
      throw new Error('Invalid SendGrid API key format');
    }
    config.SENDGRID_EMAIL = (await getSecret('SENDGRID_EMAIL')).trim();
    config.SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED = (await getSecret('SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED')).trim();
    config.SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE = (await getSecret('SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE')).trim();

    // Google Sheets configuration
    config.PENDING_APPRAISALS_SPREADSHEET_ID = (await getSecret('PENDING_APPRAISALS_SPREADSHEET_ID')).trim();
    config.GOOGLE_SHEET_NAME = (await getSecret('GOOGLE_SHEET_NAME')).trim();
    config.LOG_SPREADSHEET_ID = (await getSecret('LOG_SPREADSHEET_ID')).trim();
    config.EDIT_SHEET_NAME = (await getSecret('EDIT_SHEET_NAME')).trim();

    // OpenAI configuration
    config.OPENAI_API_KEY = (await getSecret('OPENAI_API_KEY')).trim();
    if (!config.OPENAI_API_KEY.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format');
    }

    console.log('Configuration initialized successfully');
    return config;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Using development configuration due to error:', error.message);
      return require('./development.config');
    }
    console.error('Error initializing configuration:', error);
    throw error;
  }
}

module.exports = { config, initializeConfig };