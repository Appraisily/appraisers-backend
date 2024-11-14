const OpenAI = require('openai');
const { config } = require('../config');

class OpenAIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.OPENAI_API_KEY
    });
  }

  async generateDescription(imageUrl) {
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