const fetch = require('node-fetch');
const FormData = require('form-data');
const { config } = require('../config');

class AIService {
  constructor() {
    this.isAvailable = false;
    this.endpoint = 'https://michelle-gmail-856401495068.us-central1.run.app/api/process-message';
    this.apiKey = null;
    this.initialize();
  }

  initialize() {
    try {
      if (!config.DIRECT_API_KEY) {
        throw new Error('DIRECT_API_KEY not found in config');
      }
      this.apiKey = config.DIRECT_API_KEY;
      this.isAvailable = true;
      console.log('✓ AI Service initialized with API key');
      return true;
    } catch (error) {
      console.error('❌ AI Service initialization failed:', error);
      this.isAvailable = false;
      return false;
    }
  }

  async processImages(images, prompt) {
    try {
      if (!this.isAvailable || !this.apiKey) {
        this.initialize();
      }

      if (!this.apiKey) {
        throw new Error('API key not configured');
      }

      const formData = new FormData();
      formData.append('text', prompt);

      // Add images to form data
      for (const [key, url] of Object.entries(images)) {
        if (url) {
          try {
            const imageResponse = await fetch(url);
            if (!imageResponse.ok) {
              throw new Error(`Failed to fetch image: ${imageResponse.status}`);
            }
            const buffer = await imageResponse.buffer();
            formData.append('images', buffer, `${key}.jpg`);
          } catch (error) {
            console.error(`Error processing ${key} image:`, error);
          }
        }
      }

      console.log('Making request to Michelle with API key:', this.apiKey.substring(0, 4) + '...');
      
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
          'Accept': 'application/json'
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Michelle API error response:', errorText);
        throw new Error(`AI service error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (!data.response?.text) {
        throw new Error('Invalid response format from AI service');
      }

      return data.response.text;
    } catch (error) {
      console.error('Error in processImages:', error);
      throw error;
    }
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
    if (!appraiserDescription || !iaDescription) {
      throw new Error('Both descriptions are required for merging');
    }

    try {
      if (!this.isAvailable || !this.apiKey) {
        this.initialize();
      }

      const formData = new FormData();
      formData.append('text', `Please merge these two artwork descriptions into a single, cohesive paragraph that prioritizes the appraiser's description while incorporating relevant details from the AI description. Keep it under 350 characters.

Appraiser's Description: ${appraiserDescription}

AI Description: ${iaDescription}`);

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
          'Accept': 'application/json'
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to merge descriptions: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (!data.response?.text) {
        throw new Error('Invalid response format from AI service');
      }

      return data.response.text;
    } catch (error) {
      console.error('Error merging descriptions:', error);
      throw error;
    }
  }
}

module.exports = new AIService();