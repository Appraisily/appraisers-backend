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
      console.log('🔄 Initializing WordPress service...');

      // Check credentials
      if (!config.WORDPRESS_API_URL) {
        throw new Error('WordPress API URL not configured');
      }
      console.log('✓ WordPress API URL found:', config.WORDPRESS_API_URL);

      if (!config.WORDPRESS_USERNAME) {
        throw new Error('WordPress username not configured');
      }
      console.log('✓ WordPress username found');

      if (!config.WORDPRESS_APP_PASSWORD) {
        throw new Error('WordPress app password not configured');
      }
      console.log('✓ WordPress app password found');

      // Set up service
      this.baseUrl = config.WORDPRESS_API_URL;
      this.auth = Buffer.from(
        `${encodeURIComponent(config.WORDPRESS_USERNAME)}:${config.WORDPRESS_APP_PASSWORD}`
      ).toString('base64');

      console.log('🔄 Testing WordPress connection...');
      
      // Test connection
      const testResponse = await fetch(`${this.baseUrl}/posts?per_page=1`, {
        headers: {
          'Authorization': `Basic ${this.auth}`
        }
      });

      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        throw new Error(`WordPress connection test failed (${testResponse.status}): ${errorText}`);
      }

      this.isAvailable = true;
      console.log('✅ WordPress service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ WordPress service initialization failed:', error);
      this.isAvailable = false;
      throw error;
    }
  }

  async getPost(postId) {
    try {
      console.log(`🔄 Fetching WordPress post ${postId}...`);

      if (!this.isAvailable) {
        console.log('WordPress service not initialized, attempting initialization...');
        await this.initialize();
      }

      const endpoint = `${this.baseUrl}/appraisals/${postId}`;
      console.log('Making request to:', endpoint);

      const response = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.auth}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('WordPress API error response:', errorText);
        throw new Error(`WordPress API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Successfully fetched WordPress post');
      return data;
    } catch (error) {
      console.error(`❌ Error fetching WordPress post ${postId}:`, error);
      throw error;
    }
  }

  async updatePost(postId, data) {
    try {
      console.log(`🔄 Updating WordPress post ${postId}...`);
      console.log('Update data:', JSON.stringify(data));

      if (!this.isAvailable) {
        console.log('WordPress service not initialized, attempting initialization...');
        await this.initialize();
      }

      const endpoint = `${this.baseUrl}/appraisals/${postId}`;
      console.log('Making request to:', endpoint);

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.auth}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('WordPress API error response:', errorText);
        throw new Error(`WordPress API error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Successfully updated WordPress post');
      return result;
    } catch (error) {
      console.error(`❌ Error updating WordPress post ${postId}:`, error);
      throw error;
    }
  }

  async generatePdf(postId, session_ID) {
    try {
      console.log(`🔄 Generating PDF for post ${postId}...`);

      const response = await fetch('https://appraisals-backend-856401495068.us-central1.run.app/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          postId,
          session_ID
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDF generation error:', errorText);
        throw new Error(`Failed to generate PDF: ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'PDF generation failed');
      }

      console.log('✅ PDF generated successfully');
      return {
        pdfLink: data.pdfLink,
        docLink: data.docLink
      };
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      throw error;
    }
  }
}

module.exports = new WordPressService();