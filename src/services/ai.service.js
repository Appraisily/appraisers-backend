const fetch = require('node-fetch');
const FormData = require('form-data');
const { config } = require('../config');

class AIService {
  constructor() {
    this.isAvailable = false;
    this.endpoint = 'https://michelle-gmail-856401495068.us-central1.run.app/api/process-message';
    this.apiKey = null;
  }

  async initialize() {
    try {
      // Get API key from Secret Manager
      const { getSecret } = require('../utils/secretManager');
      this.apiKey = await getSecret('DIRECT_API_KEY');

      if (!this.apiKey) {
        throw new Error('Failed to retrieve DIRECT_API_KEY from Secret Manager');
      }

      this.isAvailable = true;
      console.log('✓ AI service initialized');
      return true;
    } catch (error) {
      console.error('❌ AI Service initialization failed:', error.message);
      this.isAvailable = false;
      this.apiKey = null;
      return false; 
    }
  }

  async processImages(images, prompt) {
    try {
      if (!this.isAvailable || !this.apiKey) {
        await this.initialize();
      }

      if (!this.apiKey) {
        throw new Error('Failed to initialize AI service');
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
    const prompt = `Please provide a comprehensive and detailed description of the artwork or antique shown in the image. Focus on the following aspects:

Overall Visual Appearance: Describe the subject matter, scene, or objects depicted.
Artistic Style and Techniques: Identify the style, genre, and any specific techniques used by the artist or craftsman.
Medium and Materials: Specify the materials, mediums, and any notable textures or finishes.
Color Palette and Composition: Analyze the use of colors, lighting, perspective, and compositional elements.
Notable Features and Characteristics: Point out any unique features, symbols, motifs, or intricate details.
Signatures and Markings: Note any visible signatures, inscriptions, marks, or labels, including their placement and appearance.
Age and Condition: Observe any signs of aging, wear, restoration, or provenance details that may indicate the item's history.
Historical and Cultural Context: Provide insights into the possible historical period, cultural background, or artistic movement associated with the piece.

Please make the description as detailed and thorough as possible, suitable for an expert appraisal or analysis of the artwork or antique.
Format: Write a paragraph of less than 200 words, no titles or subtitles or sections, just the text`;

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
        await this.initialize();
      }

      if (!this.apiKey) {
        throw new Error('Failed to initialize AI service');
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