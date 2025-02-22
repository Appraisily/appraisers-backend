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
      console.log('[StorageService] Service not initialized, initializing...');
      await this.initialize();
    }

    try {
      // Extract bucket name and folder path
      const [bucketName, ...folderParts] = bucketPath.split('/');
      const folderPath = folderParts.join('/');
      console.log(`[StorageService] Listing files in bucket: ${bucketName}, path: ${folderPath}`);

      const [files] = await this.storage.bucket(bucketName).getFiles({
        prefix: folderPath,
        delimiter: '/'
      });

      console.log(`[StorageService] Found ${files.length} files in bucket`);

      // Generate signed URLs for each file (valid for 1 hour)
      console.log('[StorageService] Generating signed URLs...');
      const signedUrls = await Promise.all(
        files
          .filter(file => !file.name.endsWith('/')) // Exclude folders
          .map(async file => {
            console.log(`[StorageService] Processing file: ${file.name}`);
            const [url] = await file.getSignedUrl({
              version: 'v4',
              action: 'read',
              expires: Date.now() + 24 * 3600 * 1000 // 24 hours
            });

            console.log(`[StorageService] Generated signed URL for: ${file.name}`);
            return {
              name: file.name.split('/').pop(),
              url,
              contentType: file.metadata.contentType,
              size: parseInt(file.metadata.size, 10)
            };
          })
      );

      console.log(`[StorageService] Successfully generated ${signedUrls.length} signed URLs`);
      return signedUrls;
    } catch (error) {
      console.error('[StorageService] Error listing files:', error);
      console.error('[StorageService] Stack:', error.stack);
      throw error;
    }
  }
}

module.exports = new StorageService();