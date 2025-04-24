const { getSecret } = require('../services/secretManager');

const config = {};

async function initializeConfig() {
  try {
    console.log('Initializing configuration...');

    // Core configuration
    config.JWT_SECRET = await getSecret('jwt-secret');
    config.SHARED_SECRET = await getSecret('SHARED_SECRET');
    config.GOOGLE_CLOUD_PROJECT_ID = await getSecret('GOOGLE_CLOUD_PROJECT_ID');
    config.DIRECT_API_KEY = await getSecret('DIRECT_API_KEY');

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
    config.GOOGLE_DOCS_CREDENTIALS = await getSecret('GOOGLE_DOCS_CREDENTIALS');
    
    // Set the exact sheet name for completed appraisals - must match exactly what's in the spreadsheet
    config.COMPLETED_SHEET_NAME = 'Completed Appraisals';
    
    // Task Queue service URL
    try {
      config.TASK_QUEUE_URL = (await getSecret('TASK_QUEUE_URL')).trim();
      console.log(`Task Queue URL loaded: ${config.TASK_QUEUE_URL}`);
    } catch (error) {
      // Fallback to default URL if secret is not set
      config.TASK_QUEUE_URL = 'https://appraisers-task-queue-856401495068.us-central1.run.app';
      console.warn(`Using default Task Queue URL: ${config.TASK_QUEUE_URL}`);
    }

    // Appraisals Backend URL
    try {
      config.APPRAISALS_BACKEND_URL = (await getSecret('APPRAISALS_BACKEND_URL')).trim();
      console.log(`Appraisals Backend URL loaded: ${config.APPRAISALS_BACKEND_URL}`);
    } catch (error) {
      // Fallback to default URL if secret is not set
      config.APPRAISALS_BACKEND_URL = 'https://appraisers-backend-856401495068.us-central1.run.app';
      console.warn(`Using default Appraisals Backend URL: ${config.APPRAISALS_BACKEND_URL}`);
    }

    console.log('Configuration initialized successfully.');
    return config;
  } catch (error) {
    console.error('Error initializing configuration:', error);
    throw error;
  }
}

module.exports = { config, initializeConfig };