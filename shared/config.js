// shared/config.js

const { getSecret } = require('./secretManager');

const config = {};

async function initializeConfig() {
  try {
    config.JWT_SECRET = await getSecret('jwt-secret');
    console.log('JWT_SECRET obtenido exitosamente.');

    let wpApiUrl = (await getSecret('WORDPRESS_API_URL')).trim();
    // Ensure correct WordPress URL format
    wpApiUrl = wpApiUrl.replace('www.resources', 'resources');
    config.WORDPRESS_API_URL = wpApiUrl;
    
    config.WORDPRESS_USERNAME = (await getSecret('wp_username')).trim();
    config.WORDPRESS_APP_PASSWORD = (await getSecret('wp_app_password')).trim();
    console.log('Credenciales de WordPress obtenidas exitosamente.');

    config.SENDGRID_API_KEY = (await getSecret('SENDGRID_API_KEY')).trim();
    config.SENDGRID_EMAIL = (await getSecret('SENDGRID_EMAIL')).trim();
    config.SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED = (await getSecret('SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED')).trim();
    config.SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE = (await getSecret('SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE')).trim();
    console.log('Credenciales de SendGrid obtenidas exitosamente.');

    config.PENDING_APPRAISALS_SPREADSHEET_ID = (await getSecret('PENDING_APPRAISALS_SPREADSHEET_ID')).trim();
    config.GOOGLE_SHEET_NAME = (await getSecret('GOOGLE_SHEET_NAME')).trim();
    console.log('PENDING_APPRAISALS_SPREADSHEET_ID y GOOGLE_SHEET_NAME obtenidos exitosamente.');

    config.LOG_SPREADSHEET_ID = (await getSecret('LOG_SPREADSHEET_ID')).trim();
    config.EDIT_SHEET_NAME = (await getSecret('EDIT_SHEET_NAME')).trim();
    console.log('LOG_SPREADSHEET_ID y EDIT_SHEET_NAME obtenidos exitosamente.');

    config.GCS_BUCKET_NAME = (await getSecret('GCS_BUCKET_NAME')).trim();
    config.GOOGLE_CLOUD_PROJECT_ID = (await getSecret('GOOGLE_CLOUD_PROJECT_ID')).trim();
    config.GOOGLE_DOCS_CREDENTIALS = await getSecret('GOOGLE_DOCS_CREDENTIALS');
    config.GOOGLE_VISION_CREDENTIALS = await getSecret('GOOGLE_VISION_CREDENTIALS');

    config.OPENAI_API_KEY = (await getSecret('OPENAI_API_KEY')).trim();
    console.log('OPENAI_API_KEY obtenido exitosamente.');

    config.SHARED_SECRET = (await getSecret('SHARED_SECRET')).trim();
    console.log('SHARED_SECRET obtenido exitosamente.');

    config.SALES_SPREADSHEET_ID = (await getSecret('SALES_SPREADSHEET_ID')).trim();
    console.log('SALES_SPREADSHEET_ID obtenido exitosamente.');

    console.log('Todas las configuraciones han sido inicializadas correctamente.');
  } catch (error) {
    console.error('Error inicializando la configuración:', error);
    throw error;
  }
}

module.exports = { config, initializeConfig };