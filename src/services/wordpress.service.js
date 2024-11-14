const fetch = require('node-fetch');
const { config } = require('../config');

class WordPressService {
  constructor() {
    this.baseUrl = config.WORDPRESS_API_URL;
    this.auth = Buffer.from(
      `${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`
    ).toString('base64');
  }

  async getPost(postId) {
    try {
      const response = await fetch(`${this.baseUrl}/appraisals/${postId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.auth}`
        }
      });

      if (!response.ok) {
        throw new Error(`WordPress API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching WordPress post:', error);
      throw error;
    }
  }

  async updatePost(postId, data) {
    try {
      const response = await fetch(`${this.baseUrl}/appraisals/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.auth}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`WordPress API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating WordPress post:', error);
      throw error;
    }
  }

  async updateAcfField(postId, fieldName, fieldValue) {
    return this.updatePost(postId, {
      acf: {
        [fieldName]: fieldValue
      }
    });
  }
}

module.exports = new WordPressService();