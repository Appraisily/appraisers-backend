const { PubSub } = require('@google-cloud/pubsub');
const { getSecret } = require('./secretManager');
const fetch = require('node-fetch');

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
    this.validProcessors = null;
    this.processorSchemas = {};
    this.crmApiUrl = process.env.CRM_API_URL || 'https://crm-856401495068.us-central1.run.app';
    this.lastProcessorFetch = 0;
    this.processorCacheTtl = 3600000; // 1 hour in milliseconds
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
   * Fetch available CRM processors from the CRM API
   * @param {boolean} forceRefresh - Force a refresh of the processor cache
   * @returns {Promise<string[]>} List of valid processor types
   */
  async getAvailableProcessors(forceRefresh = false) {
    try {
      const now = Date.now();
      // Return cached list if it exists and is not expired
      if (this.validProcessors && !forceRefresh && (now - this.lastProcessorFetch < this.processorCacheTtl)) {
        return this.validProcessors;
      }

      // Fetch processors from CRM API
      console.log('🔄 Fetching available CRM processors from API...');
      const response = await fetch(`${this.crmApiUrl}/api/docs/processors`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch processors: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success || !Array.isArray(data.data)) {
        throw new Error('Invalid response format from CRM API');
      }
      
      // Extract processor types and schemas
      this.validProcessors = data.data.map(p => p.type);
      
      // Store schemas for each processor
      data.data.forEach(processor => {
        this.processorSchemas[processor.type] = processor.schema;
      });
      
      this.lastProcessorFetch = now;
      console.log(`✅ Fetched ${this.validProcessors.length} CRM processors: ${this.validProcessors.join(', ')}`);
      
      return this.validProcessors;
    } catch (error) {
      console.warn(`⚠️ Error fetching CRM processors: ${error.message}`);
      
      // If we failed to fetch but have a previous cache, use that
      if (this.validProcessors) {
        console.warn('⚠️ Using cached processor list due to fetch error');
        return this.validProcessors;
      }
      
      // Otherwise return a default set of known processors
      return [
        'appraisalReadyNotification',
        'bulkAppraisalFinalized',
        'screenerNotification',
        'chatSummary',
        'gmailInteraction',
        'appraisalRequest',
        'stripePayment',
        'bulkAppraisalEmailUpdate'
      ];
    }
  }

  /**
   * Validate if the process type is available in the CRM system
   * @param {string} processType - The process type to validate
   * @returns {Promise<boolean>} Whether the process type is valid
   */
  async isValidProcessType(processType) {
    if (!processType) return false;
    
    const validProcessors = await this.getAvailableProcessors();
    return validProcessors.includes(processType);
  }

  /**
   * Get detailed schema for a specific processor type
   * @param {string} processType - The process type to get schema for
   * @returns {Promise<object|null>} The processor schema or null if not found
   */
  async getProcessorSchema(processType) {
    try {
      // Check if we already have the schema cached
      if (this.processorSchemas[processType]) {
        return this.processorSchemas[processType];
      }

      // Fetch specific processor details
      const response = await fetch(`${this.crmApiUrl}/api/docs/processors/${processType}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch processor schema: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.data || !data.data.schema) {
        throw new Error('Invalid schema response format from CRM API');
      }
      
      // Cache the schema
      this.processorSchemas[processType] = data.data.schema;
      
      return data.data.schema;
    } catch (error) {
      console.warn(`⚠️ Error fetching processor schema for ${processType}: ${error.message}`);
      return null;
    }
  }

  /**
   * Send a notification to the CRM system using the appropriate process type
   * @param {string} processType - CRM process type (e.g., "appraisalReadyNotification", "bulkAppraisalFinalized")
   * @param {object} customerData - Customer information {email, name}
   * @param {object} data - Additional data to include in notification
   * @param {string} [sessionId] - Optional session ID, will be generated if not provided
   * @returns {Promise<boolean>} Success status
   */
  async sendNotification(processType, customerData, data, sessionId = null) {
    // Only get secrets if not initialized yet
    if (!this.isInitialized) {
      const secretsSuccess = await this.getSecrets();
      if (!secretsSuccess) {
        console.warn('⚠️ Failed to get CRM secrets, skipping notification');
        return false;
      }
    }

    try {
      // Validate the process type against available processors
      const isValid = await this.isValidProcessType(processType);
      if (!isValid) {
        console.warn(`⚠️ Invalid CRM process type: ${processType}`);
        console.warn('⚠️ Available process types: ' + (await this.getAvailableProcessors()).join(', '));
        throw new Error(`Invalid CRM process type: ${processType}`);
      }

      if (!customerData?.email) {
        throw new Error('Customer email is required');
      }

      // Create session ID if not provided
      if (!sessionId) {
        const emailPrefix = customerData.email.split('@')[0].substring(0, 5);
        sessionId = `${processType}_${Date.now()}_${emailPrefix}`;
      }
      
      // Create a new PubSub instance each time we send a message
      const pubsub = new PubSub({
        projectId: this.projectId
      });
      
      const topic = pubsub.topic(this.topicName);

      // Prepare message data structure according to the CRM schema
      const messageData = {
        crmProcess: processType,
        customer: {
          email: customerData.email,
          name: customerData.name || "Customer"
        },
        metadata: {
          origin: "appraisers-backend",
          sessionId: sessionId,
          environment: process.env.NODE_ENV || "production",
          timestamp: Date.now()
        },
        ...data
      };

      // Convert to Buffer for Pub/Sub
      const messageBuffer = Buffer.from(JSON.stringify(messageData));
      
      console.log(`🔄 Sending ${processType} CRM notification for customer ${customerData.email}`);
      const messageId = await topic.publish(messageBuffer);
      
      console.log(`✅ CRM notification sent successfully, Message ID: ${messageId}`);
      
      return true;
    } catch (error) {
      console.error(`❌ Error sending ${processType} CRM notification: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Send an appraisal ready notification to the CRM system
   * @param {string} customerEmail - Customer's email address
   * @param {string} customerName - Customer's name
   * @param {object} appraisalData - Appraisal data including value, description, and links
   * @param {string} [sessionId] - Optional session ID, will be generated if not provided
   * @returns {Promise<boolean>} Success status
   */
  async sendAppraisalReadyNotification(customerEmail, customerName, appraisalData, sessionId = null) {
    const customerData = {
      email: customerEmail,
      name: customerName
    };
    
    const notificationData = {
      pdf_link: appraisalData?.pdfLink || '',
      wp_link: appraisalData?.wpLink || '',
      // Include additional data as optional fields
      appraisal_value: appraisalData?.value || 'N/A',
      description: appraisalData?.description || 'No description available'
    };
    
    return this.sendNotification("appraisalReadyNotification", customerData, notificationData, sessionId);
  }

  /**
   * Send an appraisal completed notification to the CRM system
   * Uses bulkAppraisalFinalized process type
   * @param {string} customerEmail - Customer's email address
   * @param {string} customerName - Customer's name
   * @param {object} appraisalData - Appraisal data including value, description, and links
   * @returns {Promise<boolean>} Success status
   */
  async sendAppraisalCompletedNotification(customerEmail, customerName, appraisalData) {
    const customerData = {
      email: customerEmail,
      name: customerName
    };
    
    const notificationData = {
      pdf_link: appraisalData?.pdfLink || '',
      wp_link: appraisalData?.wpLink || '',
      // Include additional data as optional fields
      appraisal_value: appraisalData?.value || 'N/A',
      description: appraisalData?.description || 'No description available'
    };
    
    return this.sendNotification("bulkAppraisalFinalized", customerData, notificationData);
  }
}

// Export a singleton instance
const crmService = new CrmService();
module.exports = crmService; 