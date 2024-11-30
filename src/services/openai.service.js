const fetch = require('node-fetch');
const FormData = require('form-data');
const { config } = require('../config');

class OpenAIService {
  constructor() {
    this.isAvailable = false;
    this.aiEndpoint = 'https://michelle-gmail-856401495068.us-central1.run.app/api/process-message';
  }

  async initialize() {
    try {
      // Test connection to AI service
      const response = await fetch(this.aiEndpoint, {
        method: 'HEAD'
      });

      if (!response.ok) {
        throw new Error('AI service not available');
      }
      
      this.isAvailable = true;
      console.log('✓ AI service initialized');
      return true;
    } catch (error) {
      console.error('❌ AI service initialization failed:', error);
      this.isAvailable = false;
      throw error;
    }
  }

  async generateDescription(mainImageUrl, signatureImageUrl, ageImageUrl) {
    if (!this.isAvailable) {
      await this.initialize();
    }

    try {
      const formData = new FormData();
      
      // Add prompt text
      formData.append('text', 'Please provide a detailed description of this artwork, focusing on style, medium, composition, and notable features. Include any visible signatures or age-related characteristics if present.');

      // Add images
      if (mainImageUrl) {
        const mainResponse = await fetch(mainImageUrl);
        const mainBuffer = await mainResponse.buffer();
        formData.append('images', mainBuffer, 'main.jpg');
      }

      if (signatureImageUrl) {
        const signatureResponse = await fetch(signatureImageUrl);
        const signatureBuffer = await signatureResponse.buffer();
        formData.append('images', signatureBuffer, 'signature.jpg');
      }

      if (ageImageUrl) {
        const ageResponse = await fetch(ageImageUrl);
        const ageBuffer = await ageResponse.buffer();
        formData.append('images', ageBuffer, 'age.jpg');
      }

      // Make request to AI service
      const response = await fetch(this.aiEndpoint, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to generate description');
      }

      const data = await response.json();
      return data.text || data.message || 'No description generated';
    } catch (error) {
      console.error('Error generating description:', error);
      throw error;
    }
  }

  async mergeDescriptions(appraiserDescription, iaDescription) {
    if (!this.isAvailable) {
      await this.initialize();
    }

    if (!appraiserDescription || !iaDescription) {
      throw new Error('Both appraiser and IA descriptions are required');
    }

    const formData = new FormData();
    formData.append('text', `Please merge these two artwork descriptions into a single, cohesive paragraph that prioritizes the appraiser's description while incorporating relevant details from the AI description. Keep it under 350 characters.\n\nAppraiser's Description: ${appraiserDescription}\n\nAI Description: ${iaDescription}`);

    try {
      const response = await fetch(this.aiEndpoint, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to merge descriptions');
      }

      const data = await response.json();
      return data.text || data.message || 'No merged description generated';
    } catch (error) {
      console.error('Error merging descriptions:', error);
      throw error;
    }
  }
}

module.exports = new OpenAIService();