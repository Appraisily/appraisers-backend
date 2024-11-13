const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

// For local development, use environment variables
const isLocalDev = process.env.NODE_ENV === 'development';

async function getSecret(secretName) {
  if (isLocalDev) {
    // Use environment variables for local development
    const envVar = secretName.toUpperCase().replace(/-/g, '_');
    const value = process.env[envVar];
    if (!value) {
      throw new Error(`Environment variable ${envVar} not found`);
    }
    return value;
  }

  try {
    const client = new SecretManagerServiceClient();
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    
    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required');
    }

    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
    const [version] = await client.accessSecretVersion({ name });
    return version.payload.data.toString('utf8');
  } catch (error) {
    console.error(`Error getting secret ${secretName}:`, error);
    throw new Error(`Could not get secret ${secretName}`);
  }
}

module.exports = { getSecret };