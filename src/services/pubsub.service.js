const { PubSub } = require('@google-cloud/pubsub');
const { config } = require('../config');

class PubSubService {
  constructor() {
    this.pubsub = new PubSub({
      projectId: config.GOOGLE_CLOUD_PROJECT_ID
    });
  }

  async publishMessage(topicName, data) {
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

  async createSubscription(topicName, subscriptionName) {
    try {
      const topic = this.pubsub.topic(topicName);
      const [subscription] = await topic.createSubscription(subscriptionName);
      return subscription;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }
}

module.exports = new PubSubService();