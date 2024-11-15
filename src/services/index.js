const emailService = require('./email.service');
const sheetsService = require('./sheets.service');
const pubsubService = require('./pubsub.service');
const openaiService = require('./openai.service');
const wordpressService = require('./wordpress.service');

async function initializeServices() {
  try {
    console.log('Initializing services...');
    
    // Initialize required services first
    try {
      await sheetsService.initialize();
      console.log('✓ Google Sheets service initialized');
    } catch (error) {
      console.error('Failed to initialize Google Sheets service:', error);
      throw error; // This is a critical service, so we rethrow
    }

    // Initialize optional services - failures won't stop the application
    try {
      await emailService.initialize();
      console.log('✓ Email service initialized');
    } catch (error) {
      console.warn('⚠ Email service initialization failed:', error.message);
    }

    try {
      await openaiService.initialize();
      console.log('✓ OpenAI service initialized');
    } catch (error) {
      console.warn('⚠ OpenAI service initialization failed:', error.message);
    }

    try {
      await pubsubService.initialize();
      console.log('✓ PubSub service initialized');
    } catch (error) {
      console.warn('⚠ PubSub service initialization failed:', error.message);
    }

    try {
      await wordpressService.initialize();
      console.log('✓ WordPress service initialized');
    } catch (error) {
      console.warn('⚠ WordPress service initialization failed:', error.message);
    }

    console.log('Service initialization completed');
    return true;
  } catch (error) {
    console.error('Critical service initialization failed:', error);
    throw error;
  }
}

module.exports = {
  initializeServices,
  emailService,
  sheetsService,
  pubsubService,
  openaiService,
  wordpressService
};