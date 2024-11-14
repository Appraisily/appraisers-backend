const { PubSub } = require('@google-cloud/pubsub');
const fetch = require('node-fetch');
const { config, initializeConfig } = require('./config');

const API_URL = 'https://appraisers-backend-856401495068.us-central1.run.app';

async function processMessage(message) {
  try {
    const messageData = JSON.parse(message.data.toString());
    console.log('Processing task:', messageData);

    if (messageData.type !== 'COMPLETE_APPRAISAL') {
      console.log('Ignoring unknown task type:', messageData.type);
      message.ack();
      return;
    }

    const { id, appraisalValue, description } = messageData.data;

    const response = await fetch(`${API_URL}/api/appraisals/process-worker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id,
        appraisalValue,
        description
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to process appraisal: ${error}`);
    }

    console.log(`Successfully processed appraisal ${id}`);
    message.ack();
  } catch (error) {
    console.error('Error processing message:', error);
    message.nack();
  }
}

async function startWorker() {
  try {
    // Initialize configuration first
    await initializeConfig();
    console.log('Configuration initialized');

    const pubsub = new PubSub({
      projectId: config.GOOGLE_CLOUD_PROJECT_ID
    });

    const subscription = pubsub.subscription('appraisal-tasks-sub');
    console.log('Worker started, listening for messages...');

    subscription.on('message', processMessage);
    subscription.on('error', error => {
      console.error('Subscription error:', error);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('Shutting down worker...');
      subscription.close();
    });
  } catch (error) {
    console.error('Failed to start worker:', error);
    process.exit(1);
  }
}

startWorker();