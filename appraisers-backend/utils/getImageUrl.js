// utils/getImageUrl.js

const fetch = require('node-fetch');
const https = require('https');

// Configure fetch to use Node.js HTTPS module with proper SSL settings
const agent = new https.Agent({
  rejectUnauthorized: false,
  secureProtocol: 'TLSv1_2_method'
});

module.exports = async function getImageUrl(imageField) {
  if (!imageField) return null;

  if (typeof imageField === 'number' || (typeof imageField === 'string' && /^\d+$/.test(imageField))) {
    const mediaId = imageField;
    try {
      const mediaResponse = await fetch(`https://resources.appraisily.com/wp-json/wp/v2/media/${mediaId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        agent
      });

      if (!mediaResponse.ok) {
        console.error(`Error fetching image with ID ${mediaId}:`, await mediaResponse.text());
        return null;
      }

      const mediaData = await mediaResponse.json();
      return mediaData.source_url || null;
    } catch (error) {
      console.error(`Error fetching image with ID ${mediaId}:`, error);
      return null;
    }
  }

  if (typeof imageField === 'string' && imageField.startsWith('http')) {
    return imageField;
  }

  if (typeof imageField === 'object' && imageField.url) {
    return imageField.url;
  }

  return null;
};