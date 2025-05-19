const { PubSub } = require('@google-cloud/pubsub');
const { getSecret } = require('./secretManager');

/**
 * Service for sending notifications to CRM via Google Cloud Pub/Sub
 * 
 * Message schema documented in docs/CRM_SCHEMA.md
 */
class CrmService {
  constructor() {
    this.isInitialized = false;
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT || '856401495068';
    this.topicName = null;
    this.subscriptionName = null;
  }

  /**
   * Get required secrets from Secret Manager
   * @returns {Promise<boolean>} Success status
   */
  async getSecrets() {
    try {
      console.log('🔄 Getting CRM Pub/Sub secrets...');
      
      // Get configuration from Secret Manager
      this.topicName = await getSecret('PUBSUB_TOPIC_CRM_MESSAGES');
      this.subscriptionName = await getSecret('PUBSUB_SUBS_CRM_MESSAGES');
      
      if (!this.topicName || !this.subscriptionName) {
        console.warn('⚠️ Missing Pub/Sub configuration in Secret Manager');
        return false;
      }
      
      console.log(`✅ CRM secrets retrieved: topic=${this.topicName}, subscription=${this.subscriptionName}`);
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.warn(`⚠️ Error getting CRM secrets: ${error.message}`);
      return false;
    }
  }

  /**
   * Send an appraisal ready notification to the CRM system
   * @param {string} customerEmail - Customer's email address
   * @param {string} customerName - Customer's name
   * @param {object} appraisalData - Appraisal data including value, description, and links
   * @returns {Promise<boolean>} Success status
   */
  async sendAppraisalCompletedNotification(customerEmail, customerName, appraisalData) {
    // Only get secrets if not initialized yet
    if (!this.isInitialized) {
      const secretsSuccess = await this.getSecrets();
      if (!secretsSuccess) {
        console.warn('⚠️ Failed to get CRM secrets, skipping notification');
        return false;
      }
    }

    try {
      if (!customerEmail) {
        throw new Error('Customer email is required');
      }

      // Create a session ID based on timestamp and partial email
      const emailPrefix = customerEmail.split('@')[0].substring(0, 5);
      const sessionId = `appraisal_${Date.now()}_${emailPrefix}`;
      
      // Create a new PubSub instance each time we send a message
      const pubsub = new PubSub({
        projectId: this.projectId
      });
      
      const topic = pubsub.topic(this.topicName);

      // Prepare message data structure according to the updated CRM schema
      const messageData = {
        crmProcess: "appraisalReadyNotification",
        customer: {
          email: customerEmail,
          name: customerName || "Customer"
        },
        metadata: {
          origin: "appraisers-backend",
          sessionId: sessionId,
          environment: process.env.NODE_ENV || "production",
          timestamp: Date.now()
        },
        pdf_link: appraisalData?.pdfLink || '',
        wp_link: appraisalData?.wpLink || '',
        // Include additional data as optional fields
        appraisal_value: appraisalData?.value || 'N/A',
        description: appraisalData?.description || 'No description available'
      };

      // Convert to Buffer for Pub/Sub
      const messageBuffer = Buffer.from(JSON.stringify(messageData));
      
      console.log(`🔄 Sending CRM notification for customer ${customerEmail}`);
      const messageId = await topic.publish(messageBuffer);
      
      console.log(`✅ CRM notification sent successfully, Message ID: ${messageId}`);
      
      return true;
    } catch (error) {
      console.error(`❌ Error sending CRM notification: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}

// Export a singleton instance
const crmService = new CrmService();
module.exports = crmService; 