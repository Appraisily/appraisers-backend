const { OpenAI } = require('openai');
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
      console.log('✓ OpenAI service initialized');
      return true;
    } catch (error) {
      console.error('❌ OpenAI service initialization failed:', error);
      this.isAvailable = false;
      throw error;
    }
  }

  async mergeDescriptions(appraiserDescription, iaDescription) {
    if (!this.isAvailable || !this.openai) {
      await this.initialize();
    }

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Merge the appraiser and AI descriptions into a single, cohesive paragraph. Prefer the appraiser's description in case of contradictions. Keep it under 350 characters."
        },
        {
          role: "user",
          content: `Appraiser Description: ${appraiserDescription}\nAI Description: ${iaDescription}`
        }
      ],
      max_tokens: 350,
      temperature: 0.7
    });

    return response.choices[0].message.content.trim();
  }

  get chat() {
    if (!this.isAvailable || !this.openai) {
      throw new Error('OpenAI service is not available');
    }
    return this.openai.chat;
  }
}

module.exports = new OpenAIService();