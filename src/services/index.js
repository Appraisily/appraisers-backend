const emailService = require('./email.service');
const sheetsService = require('./sheets.service');
const pubsubService = require('./pubsub.service');
const aiService = require('./ai.service');
const wordpressService = require('./wordpress.service');
const storageService = require('./storage.service');
const ServiceValidator = require('../middleware/validateService');

async function initializeServices() {
  const isDev = process.env.NODE_ENV !== 'production';
  console.log(`Initializing services in ${isDev ? 'development' : 'production'} mode`);

  // In development, use mock services
  if (isDev) {
    console.log('Using development configuration');
    return {
      success: ['mock-services'],
      failed: []
    };
  }

  const services = [
    { 
      name: 'wordpress', 
      instance: wordpressService, 
      required: true,
      validate: () => ServiceValidator.validateWordPressService(wordpressService)
    },
    { 
      name: 'sheets', 
      instance: sheetsService, 
      required: true,
      validate: () => ServiceValidator.validateSheetsService(sheetsService)
    },
    { 
      name: 'email', 
      instance: emailService, 
      required: false,
      validate: () => ServiceValidator.validateEmailService(emailService)
    },
    { 
      name: 'ai', 
      instance: aiService, 
      required: false,
      validate: () => ServiceValidator.validateAIService(aiService)
    },
    { 
      name: 'pubsub', 
      instance: pubsubService, 
      required: false,
      validate: () => ServiceValidator.validatePubSubService(pubsubService)
    },
    {
      name: 'storage',
      instance: storageService,
      required: true,
      validate: () => true
    }
  ];

  const results = {
    success: [],
    failed: []
  };

  for (const { name, instance, required, validate } of services) {
    try {
      console.log(`Initializing ${name} service...`);
      
      // Validate service methods
      validate();
      
      // Initialize service
      if (instance.initialize) {
        await instance.initialize();
      }
      
      console.log(`✓ ${name} service initialized`);
      results.success.push(name);
    } catch (error) {
      console.error(`✗ ${name} service failed:`, error.message);
      results.failed.push(name);
      
      if (required && !isDev) {
        throw error;
      }
    }
  }

  return results;
}

module.exports = {
  initializeServices,
  emailService,
  sheetsService,
  pubsubService,
  aiService,
  wordpressService,
  storageService
};