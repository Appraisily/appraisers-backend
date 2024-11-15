const emailService = require('./email.service');
const sheetsService = require('./sheets.service');
const pubsubService = require('./pubsub.service');
const openaiService = require('./openai.service');
const wordpressService = require('./wordpress.service');

async function initializeServices() {
  // In development, only initialize required services
  const isDev = process.env.NODE_ENV !== 'production';

  const services = {
    wordpress: { service: wordpressService, required: !isDev },
    sheets: { service: sheetsService, required: !isDev },
    email: { service: emailService, required: false },
    openai: { service: openaiService, required: false },
    pubsub: { service: pubsubService, required: false }
  };

  const results = {
    success: [],
    failed: []
  };

  for (const [name, { service, required }] of Object.entries(services)) {
    try {
      await service.initialize();
      console.log(`✓ ${name} service initialized`);
      results.success.push(name);
    } catch (error) {
      console.error(`✗ ${name} service initialization failed:`, error.message);
      results.failed.push(name);
      
      if (required) {
        throw new Error(`Required service ${name} failed to initialize: ${error.message}`);
      }
    }
  }

  console.log('\nService Initialization Summary:');
  console.log('Successful:', results.success.join(', ') || 'None');
  console.log('Failed:', results.failed.join(', ') || 'None');

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