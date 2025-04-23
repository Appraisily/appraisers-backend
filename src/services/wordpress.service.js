const fetch = require('node-fetch');
const { config } = require('../config');
const axios = require('axios');

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
      console.log('📌 DEBUG - WordPress API URL from config:', config.WORDPRESS_API_URL);
      console.log('📌 DEBUG - WordPress API baseUrl after processing:', this.baseUrl);
      
      // First test with regular posts endpoint
      const testUrl = `${this.baseUrl}/posts?per_page=1`;
      console.log('📌 DEBUG - Test connection URL (regular posts):', testUrl);
      
      const testResponse = await fetch(testUrl, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.auth}`
        }
      });
      
      // If that works, also test the custom post type endpoint to ensure it exists
      if (testResponse.ok) {
        try {
          const cptTestUrl = `${this.baseUrl}/appraisals?per_page=1`;
          console.log('📌 DEBUG - Testing custom post type endpoint:', cptTestUrl);
          
          const cptResponse = await fetch(cptTestUrl, {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Basic ${this.auth}`
            }
          });
          
          if (cptResponse.ok) {
            console.log('✅ Custom post type endpoint is accessible');
          } else {
            console.warn(`⚠️ Custom post type endpoint returned ${cptResponse.status}. Appraisals might not be properly registered as a custom post type.`);
          }
        } catch (cptError) {
          console.warn('⚠️ Error testing custom post type endpoint:', cptError.message);
        }
      }

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
      console.log('📌 DEBUG - Making request to:', endpoint);
      console.log('📌 DEBUG - WordPress configuration:',
        { 
          baseUrl: this.baseUrl,
          username: config.WORDPRESS_USERNAME ? '***' : 'Not set',
          appPasswordLength: config.WORDPRESS_APP_PASSWORD ? config.WORDPRESS_APP_PASSWORD.length : 0
        }
      );

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

      // Get the response text first to check for HTML debug content
      const responseText = await response.text();
      
      // Check if the response contains HTML debug information (starts with a div)
      if (responseText.trim().startsWith('<div')) {
        console.warn('⚠️ WordPress response contains HTML debug content');
        
        try {
          // Extract the JSON part from the response - look for the first valid JSON object
          // This regex looks for content after the closing </div> tag
          const jsonMatch = responseText.match(/<\/div>(.+)/s);
          
          if (jsonMatch && jsonMatch[1]) {
            const jsonPart = jsonMatch[1].trim();
            const data = JSON.parse(jsonPart);
            console.log('✅ Successfully extracted JSON from mixed HTML/JSON response');
            return data;
          } else {
            console.error('❌ Could not extract JSON data from HTML/JSON response');
            throw new Error('WordPress API returned invalid response format with HTML content');
          }
        } catch (jsonError) {
          console.error('❌ Error parsing JSON from WordPress response:', jsonError);
          throw new Error(`WordPress API returned malformed response: ${jsonError.message}`);
        }
      } else {
        // Regular JSON response
        try {
          const data = JSON.parse(responseText);
          console.log('✅ Successfully fetched WordPress post');
          return data;
        } catch (jsonError) {
          console.error('❌ Error parsing JSON from WordPress response:', jsonError);
          console.error('Response content sample:', responseText.substring(0, 200));
          throw new Error(`WordPress API returned invalid JSON: ${jsonError.message}`);
        }
      }
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

  /**
   * Get WordPress post with all metadata
   * @param {string} postId - WordPress post ID
   * @returns {Promise<object>} WordPress post with metadata
   */
  async getPostWithMetadata(postId) {
    try {
      console.log(`🔄 Fetching WordPress post ${postId} with metadata...`);

      if (!this.isAvailable) {
        await this.initialize();
      }

      // Fetch the post with embedded ACF fields - using appraisals custom post type endpoint
      const fullUrl = `${this.baseUrl}/appraisals/${postId}?_embed=true&acf_format=standard`;
      console.log('📌 DEBUG - Full WordPress API URL:', fullUrl);
      
      const response = await fetch(
        fullUrl,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Basic ${this.auth}`
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('WordPress API error response:', errorText);
        throw new Error(`WordPress API error (${response.status}): ${errorText}`);
      }

      // Get the response text first to check for HTML debug content
      const responseText = await response.text();
      let postData;
      
      if (responseText.trim().startsWith('<div')) {
        // Handle HTML debug content
        const jsonMatch = responseText.match(/<\/div>(.+)/s);
        if (jsonMatch && jsonMatch[1]) {
          postData = JSON.parse(jsonMatch[1].trim());
        } else {
          throw new Error('Could not extract JSON data from HTML/JSON response');
        }
      } else {
        // Regular JSON response
        postData = JSON.parse(responseText);
      }

      // Initialize metadata from ACF fields 
      // WordPress stores custom fields in ACF, so we can use those instead of a separate meta endpoint
      postData.meta = {};
      
      // Extract metadata from ACF fields which are already in the post data
      if (postData.acf) {
        // Look for metadata fields in ACF
        const metadataFields = ['processing_history', 'processing_steps', 'last_processed'];
        
        metadataFields.forEach(field => {
          if (postData.acf[field]) {
            try {
              // Try to parse JSON string values
              if (typeof postData.acf[field] === 'string' && 
                  (postData.acf[field].startsWith('{') || postData.acf[field].startsWith('['))) {
                postData.meta[field] = JSON.parse(postData.acf[field]);
              } else {
                postData.meta[field] = postData.acf[field];
              }
            } catch (e) {
              // If parsing fails, use raw value
              postData.meta[field] = postData.acf[field];
            }
          }
        });
      }

      // Try the separate meta endpoint, but don't fail if it's not available
      try {
        const metaResponse = await fetch(
          `${this.baseUrl}/appraisals/${postId}/meta`,
          {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Basic ${this.auth}`
            }
          }
        );

        if (!metaResponse.ok) {
          console.warn(`⚠️ Metadata endpoint not available: ${metaResponse.status}. Using ACF fields for metadata.`);
        } else {
          const metaResponseText = await metaResponse.text();
          let metaData;

          if (metaResponseText.trim().startsWith('<div')) {
            // Handle HTML debug content in meta response
            const jsonMatch = metaResponseText.match(/<\/div>(.+)/s);
            if (jsonMatch && jsonMatch[1]) {
              metaData = JSON.parse(jsonMatch[1].trim());
            } else {
              console.warn('⚠️ Could not extract meta JSON data from HTML/JSON response');
              metaData = [];
            }
          } else {
            // Regular JSON response
            metaData = JSON.parse(metaResponseText);
          }

          // Format the metadata for easier access
          if (Array.isArray(metaData)) {
            metaData.forEach(meta => {
              try {
                // Try to parse JSON values
                postData.meta[meta.key] = typeof meta.value === 'string' && 
                  (meta.value.startsWith('{') || meta.value.startsWith('[')) ? 
                  JSON.parse(meta.value) : meta.value;
              } catch (e) {
                // If parsing fails, use the raw value
                postData.meta[meta.key] = meta.value;
              }
            });
          }
        }
      } catch (metaError) {
        console.warn(`⚠️ Error accessing metadata endpoint: ${metaError.message}. Using ACF fields for metadata.`);
      }

      console.log('✅ Successfully fetched WordPress post with metadata');
      return postData;
    } catch (error) {
      console.error(`❌ Error fetching WordPress post with metadata ${postId}:`, error);
      throw error;
    }
  }

  /**
   * Update step processing history in WordPress post metadata
   * @param {string} postId - WordPress post ID
   * @param {string} stepName - Name of the processing step
   * @param {object} historyEntry - Information about the processing event
   */
  async updateStepProcessingHistory(postId, stepName, historyEntry) {
    try {
      console.log(`🔄 Updating processing history for step '${stepName}' in post ${postId}...`);

      if (!this.isAvailable) {
        await this.initialize();
      }

      // First, get the current processing history
      const post = await this.getPostWithMetadata(postId);
      const processingHistory = post.meta?.processing_history || {};
      
      // Add the new entry to the step's history
      if (!processingHistory[stepName]) {
        processingHistory[stepName] = [];
      }
      
      processingHistory[stepName].push(historyEntry);
      
      // Debug the metadata we're trying to update
      console.log(`🔍 DEBUG - Processing history data to update for step '${stepName}'`);
      console.log('🔍 DEBUG - History entry sample:', JSON.stringify(historyEntry).substring(0, 100));
      
      // Instead of using the custom /meta endpoint which seems to be failing,
      // use the standard ACF fields update approach via the main post endpoint
      console.log('🔍 DEBUG - Attempting to update using ACF fields approach instead of meta endpoint');
      
      const endpoint = `${this.baseUrl}/appraisals/${postId}`;
      console.log(`🔍 DEBUG - Using main post endpoint: ${endpoint}`);
      
      // Prepare ACF data with all three fields we need to update
      const processingSteps = post.meta?.processing_steps || {};
      processingSteps[stepName] = {
        lastProcessed: historyEntry.timestamp,
        status: historyEntry.status,
        user: historyEntry.user
      };
      
      const acfData = {
        acf: {
          processing_history: JSON.stringify(processingHistory),
          processing_steps: JSON.stringify(processingSteps),
          last_processed: historyEntry.timestamp
        }
      };
      
      console.log('🔍 DEBUG - Using ACF update with payload:', JSON.stringify(acfData).substring(0, 200) + '...');
      
      // Make a single request to update all fields at once
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.auth}`
        },
        body: JSON.stringify(acfData)
      });
      
      // Check response
      if (!response.ok) {
        const errorText = await response.text();
        console.error('WordPress API error updating processing history:', errorText);
        throw new Error(`WordPress API error (${response.status}): ${errorText}`);
      }
      
      // Log successful response
      const responseData = await response.json();
      console.log(`✅ Successfully updated post with ACF fields, response ID: ${responseData.id || 'unknown'}`);
      
      console.log('✅ Successfully updated processing history');
      return true;
    } catch (error) {
      console.error('❌ Error updating processing history:', error);
      throw error;
    }
  }

  /**
   * Update a field in the WordPress post
   * @param {string} postId - WordPress post ID
   * @param {string} field - Field to update (content, title, etc.)
   * @param {string} value - New value for the field
   */
  async updatePostField(postId, field, value) {
    try {
      console.log(`🔄 Updating WordPress post field '${field}' for post ${postId}...`);

      if (!this.isAvailable) {
        await this.initialize();
      }

      const endpoint = `${this.baseUrl}/appraisals/${postId}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.auth}`
        },
        body: JSON.stringify({ [field]: value })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`WordPress API error updating ${field}:`, errorText);
        throw new Error(`WordPress API error (${response.status}): ${errorText}`);
      }

      const responseText = await response.text();
      let result;
      
      if (responseText.trim().startsWith('<div')) {
        // Handle HTML debug content
        const jsonMatch = responseText.match(/<\/div>(.+)/s);
        if (jsonMatch && jsonMatch[1]) {
          result = JSON.parse(jsonMatch[1].trim());
        } else {
          throw new Error('Could not extract JSON data from HTML/JSON response');
        }
      } else {
        // Regular JSON response
        result = JSON.parse(responseText);
      }

      console.log(`✅ Successfully updated WordPress post field '${field}'`);
      return result;
    } catch (error) {
      console.error(`❌ Error updating WordPress post field '${field}':`, error);
      throw error;
    }
  }
}

module.exports = new WordPressService();