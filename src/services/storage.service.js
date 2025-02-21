const { Storage } = require('@google-cloud/storage');
const { config } = require('../config');

class StorageService {
  constructor() {
    this.storage = null;
    this.isAvailable = false;
  }

  async initialize() {
    try {
      this.storage = new Storage();
      this.isAvailable = true;
      console.log('✓ Storage service initialized');
      return true;
    } catch (error) {
      console.error('❌ Storage service initialization failed:', error);
      this.isAvailable = false;
      throw error;
    }
  }

  async listFiles(bucketPath) {
    if (!this.isAvailable) {
      await this.initialize();
    }

    try {
      // Extract bucket name and folder path
      const [bucketName, ...folderParts] = bucketPath.split('/');
      const folderPath = folderParts.join('/');

      const [files] = await this.storage.bucket(bucketName).getFiles({
        prefix: folderPath,
        delimiter: '/'
      });

      // Generate signed URLs for each file (valid for 1 hour)
      const signedUrls = await Promise.all(
        files
          .filter(file => !file.name.endsWith('/')) // Exclude folders
          .map(async file => {
            const [url] = await file.getSignedUrl({
              version: 'v4',
              action: 'read',
              expires: Date.now() + 24 * 3600 * 1000 // 24 hours
            });

            return {
              name: file.name.split('/').pop(),
              url,
              contentType: file.metadata.contentType,
              size: parseInt(file.metadata.size, 10)
            };
          })
      );

      return signedUrls;
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }
}

module.exports = new StorageService();