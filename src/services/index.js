const emailService = require('./email.service');
const sheetsService = require('./sheets.service');
const pubsubService = require('./pubsub.service');
const openaiService = require('./openai.service');
const wordpressService = require('./wordpress.service');

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
    { name: 'wordpress', service: wordpressService, required: true },
    { name: 'sheets', service: sheetsService, required: true },
    { name: 'email', service: emailService, required: false },
    { name: 'openai', service: openaiService, required: false },
    { name: 'pubsub', service: pubsubService, required: false }
  ];

  const results = {
    success: [],
    failed: []
  };

  for (const { name, service, required } of services) {
    try {
      console.log(`Initializing ${name} service...`);
      await service.initialize();
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
  openaiService,
  wordpressService
};