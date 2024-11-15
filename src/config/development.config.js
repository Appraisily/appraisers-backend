// Development configuration with mock values
module.exports = {
  JWT_SECRET: 'dev-jwt-secret',
  SHARED_SECRET: 'dev-shared-secret',
  GOOGLE_CLOUD_PROJECT_ID: 'dev-project',
  
  WORDPRESS_API_URL: 'https://resources.appraisily.com/wp-json/wp/v2',
  WORDPRESS_USERNAME: 'dev_user',
  WORDPRESS_APP_PASSWORD: 'dev_password',
  
  SENDGRID_API_KEY: 'SG.dev_key',
  SENDGRID_EMAIL: 'dev@appraisily.com',
  SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED: 'template_1',
  SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE: 'template_2',
  
  PENDING_APPRAISALS_SPREADSHEET_ID: 'spreadsheet_id',
  GOOGLE_SHEET_NAME: 'Sheet1',
  LOG_SPREADSHEET_ID: 'log_id',
  EDIT_SHEET_NAME: 'Edit',
  
  OPENAI_API_KEY: 'sk-dev_key'
};