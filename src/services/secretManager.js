const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const client = new SecretManagerServiceClient();

/**
 * Get a secret from Google Secret Manager
 * @param {string} secretName - Name of the secret
 * @returns {Promise<string>} Secret value
 */
async function getSecret(secretName) {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || '856401495068';
    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
    
    console.log(`🔑 Getting secret: ${secretName}`);
    
    const [version] = await client.accessSecretVersion({ name });
    const payload = version.payload.data.toString('utf8');
    
    return payload;
  } catch (error) {
    console.warn(`⚠️ Error getting secret ${secretName}: ${error.message}`);
    // Return null instead of throwing to make the application more resilient
    return null;
  }
}

module.exports = {
  getSecret
};