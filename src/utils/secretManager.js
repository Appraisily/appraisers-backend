const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const client = new SecretManagerServiceClient();

async function getSecret(secretName) {
  try {
    console.log(`[getSecret] Fetching secret: ${secretName}`);
    const projectId = await client.getProjectId();
    
    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID not found');
    }

    const secretVersionName = `projects/${projectId}/secrets/${secretName}/versions/latest`;
    
    console.log(`[getSecret] Accessing secret version: ${secretVersionName}`);
    const [version] = await client.accessSecretVersion({ name: secretVersionName });
    const secretValue = version.payload.data.toString('utf8');
    
    console.log(`[getSecret] Successfully retrieved secret: ${secretName}`);
    return secretValue;
  } catch (error) {
    console.error(`[getSecret] Error getting secret ${secretName}:`, error);
    throw new Error(`Could not get secret ${secretName}`);
  }
}

module.exports = { getSecret };