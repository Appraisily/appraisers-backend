const { PubSub } = require('@google-cloud/pubsub');
const { config } = require('../config');

class PubSubService {
  constructor() {
    this.pubsub = null;
    this.isAvailable = false;
  }

  async initialize() {
    try {
      if (!config.GOOGLE_CLOUD_PROJECT_ID) {
        throw new Error('Google Cloud Project ID not configured');
      }

      this.pubsub = new PubSub({
        projectId: config.GOOGLE_CLOUD_PROJECT_ID
      });
      
      this.isAvailable = true;
      return true;
    } catch (error) {
      this.isAvailable = false;
      throw error;
    }
  }

  async publishMessage(topicName, data) {
    if (!this.isAvailable) {
      throw new Error('PubSub service is not available');
    }

    try {
      const topic = this.pubsub.topic(topicName);
      const messageBuffer = Buffer.from(JSON.stringify(data));
      
      const messageId = await topic.publish(messageBuffer);
      console.log(`Message ${messageId} published to topic ${topicName}`);
      
      return messageId;
    } catch (error) {
      console.error(`Error publishing message to ${topicName}:`, error);
      throw error;
    }
  }
}

module.exports = new PubSubService();