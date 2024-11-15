const fetch = require('node-fetch');
const { config } = require('../config');

class WordPressService {
  constructor() {
    this.isAvailable = false;
    this.baseUrl = null;
    this.auth = null;
  }

  async initialize() {
    try {
      if (!config.WORDPRESS_API_URL || !config.WORDPRESS_USERNAME || !config.WORDPRESS_APP_PASSWORD) {
        throw new Error('WordPress credentials not configured');
      }

      this.baseUrl = config.WORDPRESS_API_URL;
      this.auth = Buffer.from(
        `${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`
      ).toString('base64');
      
      this.isAvailable = true;
      return true;
    } catch (error) {
      this.isAvailable = false;
      throw error;
    }
  }

  async getPost(postId) {
    if (!this.isAvailable) {
      throw new Error('WordPress service is not available');
    }

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
    if (!this.isAvailable) {
      throw new Error('WordPress service is not available');
    }

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
}

module.exports = new WordPressService();