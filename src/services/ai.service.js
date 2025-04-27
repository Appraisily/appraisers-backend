const fetch = require('node-fetch');
const { getSecret } = require('./secretManager');
const { config } = require('../config');
const OpenAI = require('openai');

class AIService {
  constructor() {
    this.isAvailable = false;
    this.openai = null;
    this.apiKey = null;
  }

  async initialize() {
    try {
      // Get API key from Secret Manager
      this.apiKey = await getSecret('OPENAI_API_KEY');

      if (!this.apiKey) {
        throw new Error('Failed to retrieve OPENAI_API_KEY from Secret Manager');
      }

      this.openai = new OpenAI({
        apiKey: this.apiKey
      });

      this.isAvailable = true;
      console.log('✓ OpenAI service initialized');
      return true;
    } catch (error) {
      console.error('❌ OpenAI Service initialization failed:', error.message);
      this.isAvailable = false;
      this.apiKey = null;
      return false; 
    }
  }

  async processImageWithOpenAI(imageUrl) {
    try {
      if (!this.isAvailable || !this.openai) {
        await this.initialize();
      }

      if (!this.openai) {
        throw new Error('Failed to initialize OpenAI service');
      }

      // Fetch the image
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
      }
      const imageBuffer = await imageResponse.buffer();
      
      // Convert the image buffer to base64
      const base64Image = imageBuffer.toString('base64');
      
      // Prepare the prompt for GPT-4 Vision
      const prompt = `Please provide a comprehensive and detailed description of this artwork or antique. 
Focus on:
- Overall visual appearance (subject, scene, objects)
- Artistic style, techniques, and genre
- Medium, materials, textures, and finishes
- Color palette and composition
- Notable features, symbols, motifs, and details
- Signatures, inscriptions, marks, or labels
- Age and condition indicators
- Historical and cultural context

Be detailed and speak as an expert in art and antiques. Format your response as a single paragraph of less than 200 words.`;

      console.log('Making request to OpenAI GPT-4 Vision API');
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "system",
            content: "You are an expert art and antiques appraiser. Analyze the image and provide a detailed, accurate description without disclaiming expertise or mentioning limitations."
          },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 500
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error('Invalid response format from OpenAI');
      }

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error in processImageWithOpenAI:', error);
      throw error;
    }
  }

  async generateDescription(mainImageUrl, signatureImageUrl = '', ageImageUrl = '') {
    if (!mainImageUrl) {
      throw new Error('Main image URL is required');
    }

    try {
      // First process the main image
      const mainDescription = await this.processImageWithOpenAI(mainImageUrl);
      
      // If we have additional images, process them and combine the descriptions
      if (signatureImageUrl || ageImageUrl) {
        let additionalInfo = '';
        
        if (signatureImageUrl) {
          try {
            const signatureDescription = await this.processImageWithOpenAI(signatureImageUrl);
            additionalInfo += ` Signature details: ${signatureDescription}`;
          } catch (error) {
            console.error('Error processing signature image:', error);
          }
        }
        
        if (ageImageUrl) {
          try {
            const ageDescription = await this.processImageWithOpenAI(ageImageUrl);
            additionalInfo += ` Age indicators: ${ageDescription}`;
          } catch (error) {
            console.error('Error processing age image:', error);
          }
        }
        
        // If we got additional info, combine it with the main description
        if (additionalInfo) {
          // Use OpenAI to merge the descriptions
          return this.mergeDescriptions(mainDescription, additionalInfo);
        }
      }
      
      return mainDescription;
    } catch (error) {
      console.error('Error generating description:', error);
      throw error;
    }
  }

  async mergeDescriptions(mainDescription, additionalInfo) {
    if (!this.isAvailable || !this.openai) {
      await this.initialize();
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert art and antiques appraiser. Create a cohesive description by combining the main description with additional details."
          },
          {
            role: "user",
            content: `Merge these descriptions into one cohesive paragraph of less than 200 words:\n\nMain description: ${mainDescription}\n\nAdditional details: ${additionalInfo}`
          }
        ],
        max_tokens: 500
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error merging descriptions:', error);
      // Return just the main description if merging fails
      return mainDescription;
    }
  }
}

module.exports = new AIService();