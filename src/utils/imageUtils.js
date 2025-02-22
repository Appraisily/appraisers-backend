/**
 * Extracts metadata from image URLs
 * @param {Object} images Object containing image URLs
 * @returns {Promise<string[]>} Array of descriptions
 */
async function extractImageMetadata(images) {
  const descriptions = [];

  for (const [type, url] of Object.entries(images)) {
    if (url) {
      try {
        const imageUrl = new URL(url);
        const metadata = imageUrl.searchParams.get('description');
        if (metadata) {
          descriptions.push(`${type.charAt(0).toUpperCase() + type.slice(1)}: ${metadata}`);
        }
      } catch (error) {
        console.warn(`Could not extract ${type} image metadata:`, error);
      }
    }
  }

  return descriptions;
}

module.exports = {
  extractImageMetadata
};