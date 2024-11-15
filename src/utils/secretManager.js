const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const client = new SecretManagerServiceClient();

async function getSecret(secretName) {
  try {
    const projectId = await client.getProjectId();
    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID not found');
    }

    console.log(`Fetching secret: ${secretName}`);
    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
    
    const [version] = await client.accessSecretVersion({ name });
    const secretValue = version.payload.data.toString('utf8');
    
    console.log(`Successfully retrieved secret: ${secretName}`);
    return secretValue;
  } catch (error) {
    console.error(`Error getting secret ${secretName}:`, error);
    throw new Error(`Could not get secret ${secretName}`);
  }
}

module.exports = { getSecret };