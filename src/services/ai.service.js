const fetch = require('node-fetch');
const FormData = require('form-data');
const { config } = require('../config');

class AIService {
  constructor() {
    this.isAvailable = false;
    this.endpoint = 'https://michelle-gmail-856401495068.us-central1.run.app/api/process-message';
    this.apiKey = config.DIRECT_API_KEY;
  }

  async initialize() {
    try {
      if (!this.apiKey) {
        throw new Error('API key not configured');
      }

      this.isAvailable = true;
      console.log('✓ AI service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ AI service initialization failed:', error);
      this.isAvailable = false;
      throw error;
    }
  }

  async processImages(images, prompt) {
    if (!this.isAvailable) {
      await this.initialize();
    }

    const formData = new FormData();
    formData.append('text', prompt);

    // Add images to form data
    for (const [key, url] of Object.entries(images)) {
      if (url) {
        try {
          const imageResponse = await fetch(url);
          const buffer = await imageResponse.buffer();
          formData.append('images', buffer, `${key}.jpg`);
        } catch (error) {
          console.error(`Error processing ${key} image:`, error);
        }
      }
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    return data.response?.text || '';
  }

  async generateDescription(mainImageUrl, signatureImageUrl = '', ageImageUrl = '') {
    const prompt = `Please provide a detailed description of this artwork, focusing on:
- Style and artistic technique
- Medium and materials used
- Color palette and composition
- Notable features or characteristics
- Any visible signatures or age-related details
Keep the description concise but informative, suitable for an art appraisal context.`;

    const images = {
      main: mainImageUrl,
      signature: signatureImageUrl,
      age: ageImageUrl
    };

    return this.processImages(images, prompt);
  }

  async mergeDescriptions(appraiserDescription, iaDescription) {
    if (!this.isAvailable) {
      await this.initialize();
    }

    const formData = new FormData();
    formData.append('text', `Please merge these two artwork descriptions into a single, cohesive paragraph that prioritizes the appraiser's description while incorporating relevant details from the AI description. Keep it under 350 characters.

Appraiser's Description: ${appraiserDescription}

AI Description: ${iaDescription}`);

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to merge descriptions');
    }

    const data = await response.json();
    return data.response?.text || '';
  }
}

module.exports = new AIService();