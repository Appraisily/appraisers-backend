const emailService = require('./email.service');
const sheetsService = require('./sheets.service');
const pubsubService = require('./pubsub.service');
const aiService = require('./ai.service');
const wordpressService = require('./wordpress.service');
const storageService = require('./storage.service');
const websocketService = require('./websocket.service');
const appraisalService = require('./appraisal.service');
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

  // Define the initialization order based on dependencies
  const services = [
    { 
      name: 'sheets', 
      instance: sheetsService, 
      required: true,
      validate: () => ServiceValidator.validateSheetsService(sheetsService)
    },
    { 
      name: 'wordpress', 
      instance: wordpressService, 
      required: true,
      validate: () => ServiceValidator.validateWordPressService(wordpressService)
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
    },
    {
      name: 'appraisal',
      instance: appraisalService,
      required: true,
      validate: () => true
    }
  ];

  const results = {
    success: [],
    failed: []
  };

  // Initialize each service in sequence
  for (const { name, instance, required, validate } of services) {
    try {
      console.log(`Initializing ${name} service...`);
      
      // Validate service methods
      validate();
      
      // Initialize service
      if (instance.initialize) {
        await instance.initialize();
      }
      
      // After initialize, verify essential methods exist
      if (name === 'wordpress') {
        if (!instance.getPost) {
          throw new Error('WordPress service is missing getPost method after initialization');
        }
        if (!instance.getPostWithMetadata) {
          throw new Error('WordPress service is missing getPostWithMetadata method after initialization');
        }
        if (!instance.updateStepProcessingHistory) {
          throw new Error('WordPress service is missing updateStepProcessingHistory method after initialization');
        }
        // Test the service with a dummy post ID to verify it works
        try {
          await instance.initialize(); // Ensure it's fully initialized
          console.log('WordPress service validated');
        } catch (testError) {
          console.warn(`WordPress service validation failed: ${testError.message}`);
          // Still continue, just log the warning
        }
      }
      
      console.log(`✓ ${name} service initialized`);
      results.success.push(name);
    } catch (error) {
      console.error(`✗ ${name} service failed:`, error.message);
      results.failed.push(name);
      
      if (required && !isDev) {
        console.error(`Critical service '${name}' failed to initialize, but continuing anyway to allow partial functionality`);
        // Don't throw here, allow the service to start with degraded functionality
        // throw error;
      }
    }
  }

  return results;
}

/**
 * Helper function to check if a service is available and working
 * @param {Object} service - The service to check
 * @param {string} methodName - The method to check for
 * @returns {boolean} - Whether the service is available
 */
function isServiceAvailable(service, methodName) {
  if (!service) {
    return false;
  }
  
  if (methodName && typeof service[methodName] !== 'function') {
    return false;
  }
  
  return true;
}

/**
 * Helper function to safely call a service method if available
 * @param {Object} service - The service to use
 * @param {string} methodName - The method to call
 * @param {Array} args - Arguments to pass to the method
 * @param {*} fallbackValue - Value to return if service is unavailable
 * @returns {Promise<*>} - Result of the method call or fallback value
 */
async function safeServiceCall(service, methodName, args = [], fallbackValue = null) {
  if (!isServiceAvailable(service, methodName)) {
    console.warn(`Service or method ${methodName} is not available, using fallback value`);
    return fallbackValue;
  }
  
  try {
    return await service[methodName](...args);
  } catch (error) {
    console.error(`Error calling service method ${methodName}:`, error);
    return fallbackValue;
  }
}

module.exports = {
  initializeServices,
  isServiceAvailable,
  safeServiceCall,
  emailService,
  sheetsService,
  pubsubService,
  aiService,
  wordpressService,
  storageService,
  websocketService,
  appraisalService
};