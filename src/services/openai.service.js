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

  async generateDescription(mainImageUrl, signatureImageUrl, ageImageUrl) {
    if (!this.isAvailable || !this.openai) {
      await this.initialize();
    }

    const condensedInstructions = `
Please condense the following detailed artwork description into a synthetic, concise summary of around 50 words, retaining as much key information as possible. Follow the example format below:

Example Format: "[Style] [Medium] ([Date]), [Size]. [Color Palette]. [Composition details]. [Brushwork/Texture]. [Mood]. [Condition/details]."

Tips for Effective Condensation:
- Style: Impressionist, Realist, etc.
- Medium: Oil on canvas, watercolor, etc.
- Date: Century or specific year if available.
- Size: Medium, large, specific dimensions if known.
- Color Palette: Dominant colors used.
- Composition: Main elements and their arrangement.
- Brushwork/Texture: Loose, expressive, dynamic, etc.
- Mood: Serene, tranquil, contemplative, etc.
- Condition/Details: Missing views, signature, age, etc.
    `;

    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: condensedInstructions },
          { type: "image_url", image_url: { url: mainImageUrl, detail: "high" } }
        ]
      }
    ];

    // Add optional images if provided
    if (signatureImageUrl) {
      messages[0].content.push({
        type: "image_url",
        image_url: { url: signatureImageUrl, detail: "high" }
      });
    }

    if (ageImageUrl) {
      messages[0].content.push({
        type: "image_url",
        image_url: { url: ageImageUrl, detail: "high" }
      });
    }

    const response = await this.openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages,
      max_tokens: 300,
      temperature: 0.7
    });

    return response.choices[0].message.content.trim();
  }

  async mergeDescriptions(appraiserDescription, iaDescription) {
    if (!this.isAvailable || !this.openai) {
      await this.initialize();
    }

    if (!appraiserDescription || !iaDescription) {
      throw new Error('Both appraiser and IA descriptions are required');
    }

    const maxTitleLength = 350;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an assistant that merges appraiser and AI descriptions into a single, cohesive, and concise paragraph suitable for a WordPress title. The merged description should prefer the appraiser's description in case of any contradictions and must not exceed ${maxTitleLength} characters. Provide only the merged description without any additional text, introductions, or explanations.`
        },
        {
          role: 'user',
          content: `Appraiser Description: ${appraiserDescription}\nAI Description: ${iaDescription}\n\nPlease merge the above descriptions into a single paragraph that prefers the appraiser's description in case of any contradictions and does not exceed ${maxTitleLength} characters. The output should contain only the merged description without any additional text.`
        }
      ],
      max_tokens: Math.ceil(maxTitleLength / 4) + 10,
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