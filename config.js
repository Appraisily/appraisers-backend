// config.js

const { getSecret } = require('./secretManager');

const config = {};

async function initializeConfig() {
  try {
    // Obtener secretos desde Secret Manager
    config.JWT_SECRET = await getSecret('jwt-secret');
    console.log('JWT_SECRET obtenido exitosamente.');

    config.WORDPRESS_USERNAME = (await getSecret('wp_username')).trim();
    config.WORDPRESS_APP_PASSWORD = (await getSecret('wp_app_password')).trim();
    config.WORDPRESS_API_URL = (await getSecret('WORDPRESS_API_URL')).trim();
    console.log('Credenciales de WordPress obtenidas exitosamente.');

    config.SENDGRID_API_KEY = (await getSecret('SENDGRID_API_KEY')).trim();
    config.SENDGRID_EMAIL = (await getSecret('SENDGRID_EMAIL')).trim();
    console.log('Credenciales de SendGrid obtenidas exitosamente.');

    config.SPREADSHEET_ID = (await getSecret('PENDING_APPRAISALS_SPREADSHEET_ID')).trim();
    config.SHEET_NAME = 'Pending Appraisals'; // Puedes ajustar esto según necesites

    console.log('SPREADSHEET_ID y SHEET_NAME configurados.');
  } catch (error) {
    console.error('Error inicializando la configuración:', error);
    throw error;
  }
}

module.exports = { config, initializeConfig };
