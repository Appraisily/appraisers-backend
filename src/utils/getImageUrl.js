const fetch = require('node-fetch');
const https = require('https');

// Configure fetch to use Node.js HTTPS module with proper SSL settings
const agent = new https.Agent({
  rejectUnauthorized: false,
  secureProtocol: 'TLSv1_2_method'
});

async function getImageUrl(imageField) {
  console.log('🖼️ [getImageUrl] Processing image field:', imageField);

  if (!imageField) {
    console.log('⚠️ [getImageUrl] No image field provided');
    return null;
  }

  try {
    // Handle numeric ID or string that looks like a number
    if (typeof imageField === 'number' || (typeof imageField === 'string' && /^\d+$/.test(imageField))) {
      const mediaId = imageField;
      console.log(`🔍 [getImageUrl] Fetching media ID: ${mediaId}`);
      
      const mediaResponse = await fetch(`https://resources.appraisily.com/wp-json/wp/v2/media/${mediaId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        agent
      });

      if (!mediaResponse.ok) {
        const errorText = await mediaResponse.text();
        console.error(`❌ [getImageUrl] Error fetching image with ID ${mediaId}:`, errorText);
        return null;
      }

      const mediaData = await mediaResponse.json();
      console.log(`✅ [getImageUrl] Successfully retrieved media URL for ID ${mediaId}`);
      return mediaData.source_url || null;
    }

    // Handle direct URL
    if (typeof imageField === 'string' && imageField.startsWith('http')) {
      console.log('✅ [getImageUrl] Direct URL provided');
      return imageField;
    }

    // Handle object with URL property
    if (typeof imageField === 'object' && imageField.url) {
      console.log('✅ [getImageUrl] URL object provided');
      return imageField.url;
    }

    console.log('⚠️ [getImageUrl] Unhandled image field format');
    return null;
  } catch (error) {
    console.error('❌ [getImageUrl] Error processing image field:', error);
    return null;
  }
}

module.exports = getImageUrl;