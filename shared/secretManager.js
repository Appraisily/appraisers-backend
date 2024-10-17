// secretManager.js

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const client = new SecretManagerServiceClient();

async function getSecret(secretName) {
  try {
    const projectId = await client.getProjectId();
    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

    const [version] = await client.accessSecretVersion({ name });
    const payload = version.payload.data.toString('utf8');
    return payload;
  } catch (error) {
    console.error(`Error obteniendo el secreto ${secretName}:`, error);
    throw new Error(`No se pudo obtener el secreto ${secretName}`);
  }
}

module.exports = { getSecret };
