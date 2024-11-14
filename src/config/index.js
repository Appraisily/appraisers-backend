const { getSecret } = require('../utils/secretManager');

const config = {};

async function initializeConfig() {
  try {
    console.log('Initializing configuration...');

    // Get all secrets in parallel for better performance
    const [
      jwtSecret,
      wpApiUrl,
      wpUsername,
      wpAppPassword,
      sendgridApiKey,
      sendgridEmail,
      templateCompleted,
      templateUpdate,
      spreadsheetId,
      sheetName,
      openaiApiKey,
      sharedSecret,
      projectId
    ] = await Promise.all([
      getSecret('jwt-secret'),
      getSecret('WORDPRESS_API_URL'),
      getSecret('wp_username'),
      getSecret('wp_app_password'),
      getSecret('SENDGRID_API_KEY'),
      getSecret('SENDGRID_EMAIL'),
      getSecret('SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED'),
      getSecret('SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE'),
      getSecret('PENDING_APPRAISALS_SPREADSHEET_ID'),
      getSecret('GOOGLE_SHEET_NAME'),
      getSecret('OPENAI_API_KEY'),
      getSecret('SHARED_SECRET'),
      getSecret('GOOGLE_CLOUD_PROJECT_ID')
    ]);

    // Set all config values
    config.JWT_SECRET = jwtSecret;
    config.WORDPRESS_API_URL = wpApiUrl.trim().replace('www.resources', 'resources');
    config.WORDPRESS_USERNAME = wpUsername.trim();
    config.WORDPRESS_APP_PASSWORD = wpAppPassword.trim();
    config.SENDGRID_API_KEY = sendgridApiKey.trim();
    config.SENDGRID_EMAIL = sendgridEmail.trim();
    config.SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED = templateCompleted.trim();
    config.SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE = templateUpdate.trim();
    config.PENDING_APPRAISALS_SPREADSHEET_ID = spreadsheetId.trim();
    config.GOOGLE_SHEET_NAME = sheetName.trim();
    config.OPENAI_API_KEY = openaiApiKey.trim();
    config.SHARED_SECRET = sharedSecret.trim();
    config.GOOGLE_CLOUD_PROJECT_ID = projectId.trim();

    console.log('Configuration initialized successfully');
    return config;
  } catch (error) {
    console.error('Error initializing configuration:', error);
    throw error;
  }
}

module.exports = { config, initializeConfig };