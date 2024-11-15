const OpenAI = require('openai');
const { config } = require('../config');

class OpenAIService {
  constructor() {
    this.openai = null;
    this.isAvailable = false;
  }

  async initialize() {
    try {
      if (!config.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      this.openai = new OpenAI({
        apiKey: config.OPENAI_API_KEY
      });
      
      this.isAvailable = true;
      return true;
    } catch (error) {
      this.isAvailable = false;
      throw error;
    }
  }

  async generateDescription(imageUrl) {
    if (!this.isAvailable) {
      throw new Error('OpenAI service is not available');
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Describe the artwork's style, medium, color palette, and composition as accurately as possible. Keep it under 50 words."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: "high",
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating description:', error);
      throw error;
    }
  }
}

module.exports = new OpenAIService();