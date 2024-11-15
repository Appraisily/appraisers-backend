const emailService = require('./email.service');
const sheetsService = require('./sheets.service');
const pubsubService = require('./pubsub.service');
const openaiService = require('./openai.service');
const wordpressService = require('./wordpress.service');

async function initializeServices() {
  const services = [
    { name: 'sheets', service: sheetsService, required: true },
    { name: 'wordpress', service: wordpressService, required: true },
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
      
      if (required) {
        throw new Error(`Required service ${name} failed to initialize: ${error.message}`);
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