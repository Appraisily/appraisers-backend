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

      if (!config.WORDPRESS_API_URL) {
        throw new Error('WordPress API URL not configured');
      }

      if (!config.WORDPRESS_USERNAME) {
        throw new Error('WordPress username not configured');
      }

      if (!config.WORDPRESS_APP_PASSWORD) {
        throw new Error('WordPress app password not configured');
      }

      this.baseUrl = config.WORDPRESS_API_URL.replace('www.resources', 'resources');
      const credentialsString = `${encodeURIComponent(config.WORDPRESS_USERNAME)}:${config.WORDPRESS_APP_PASSWORD.trim()}`;
      this.auth = Buffer.from(credentialsString).toString('base64');

      console.log('🔄 Testing WordPress connection...');
      
      const testResponse = await fetch(`${this.baseUrl}/posts?per_page=1`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.auth}`
        }
      });

      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        throw new Error(`WordPress connection test failed (${testResponse.status}): ${errorText}`);
      }

      await testResponse.json();

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
        await this.initialize();
      }

      const endpoint = `${this.baseUrl}/appraisals/${postId}`;
      console.log('Making request to:', endpoint);

      const response = await fetch(endpoint, {
        headers: {
          'Accept': 'application/json',
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
        await this.initialize();
      }

      const endpoint = `${this.baseUrl}/appraisals/${postId}`;
      console.log('Making request to:', endpoint);

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
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

      // First get post details from WordPress
      const post = await this.getPost(postId);
      const acfFields = post.acf || {};

      // Prepare the request payload
      const payload = {
        title: post.title.rendered,
        images: {
          front: acfFields.main || '',
          back: acfFields.age || '',
          signature: acfFields.signature || ''
        }
      };

      // Make request to appraisals backend
      const response = await fetch('https://appraisals-backend-856401495068.us-central1.run.app/build-pdf', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
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
        pdfLink: data.pdfUrl,
        docLink: data.docUrl
      };
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      throw error;
    }
  }
}

module.exports = new WordPressService();