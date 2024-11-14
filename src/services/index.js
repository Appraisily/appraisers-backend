const emailService = require('./email.service');
const sheetsService = require('./sheets.service');
const pubsubService = require('./pubsub.service');
const openaiService = require('./openai.service');
const wordpressService = require('./wordpress.service');

async function initializeServices() {
  try {
    console.log('Initializing services...');
    
    // Initialize Google Sheets
    await sheetsService.initialize();
    console.log('✓ Google Sheets service initialized');
    
    // Email service is self-initializing in constructor
    console.log('✓ Email service initialized');
    
    // PubSub service is self-initializing in constructor
    console.log('✓ PubSub service initialized');
    
    // OpenAI service is self-initializing in constructor
    console.log('✓ OpenAI service initialized');
    
    // WordPress service is self-initializing in constructor
    console.log('✓ WordPress service initialized');
    
    console.log('All services initialized successfully');
  } catch (error) {
    console.error('Error initializing services:', error);
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