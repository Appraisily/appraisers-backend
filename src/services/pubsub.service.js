const { PubSub } = require('@google-cloud/pubsub');
const { config } = require('../config');

class PubSubService {
  constructor() {
    this.pubsub = null;
    this.isAvailable = false;
  }

  async initialize() {
    try {
      console.log('🔄 Initializing PubSub service...');

      if (!config.GOOGLE_CLOUD_PROJECT_ID) {
        throw new Error('Google Cloud Project ID not configured');
      }

      this.pubsub = new PubSub({
        projectId: config.GOOGLE_CLOUD_PROJECT_ID
      });

      // Test connection by listing topics
      await this.pubsub.getTopics();
      
      this.isAvailable = true;
      console.log('✓ PubSub service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ PubSub service initialization failed:', error);
      this.isAvailable = false;
      throw error;
    }
  }

  async publishMessage(topicName, data) {
    try {
      if (!this.isAvailable) {
        await this.initialize();
      }

      if (!this.pubsub) {
        throw new Error('PubSub client not initialized');
      }

      console.log(`🔄 Publishing message to topic ${topicName}:`, data);

      const topic = this.pubsub.topic(topicName);
      const messageBuffer = Buffer.from(JSON.stringify(data));
      
      const messageId = await topic.publish(messageBuffer);
      console.log(`✓ Message ${messageId} published to topic ${topicName}`);
      
      return messageId;
    } catch (error) {
      console.error(`❌ Error publishing message to ${topicName}:`, error);
      throw error;
    }
  }
}

module.exports = new PubSubService();