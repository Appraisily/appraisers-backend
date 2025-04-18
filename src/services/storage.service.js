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
      console.log(`[StorageService] Full bucket path: gs://${bucketPath}`);

      const [files] = await this.storage.bucket(bucketName).getFiles({
        prefix: `${folderPath}/`
      });

      // Filter out the folder itself and any metadata folders
      const filteredFiles = files.filter(file => {
        const name = file.name;
        return name.startsWith(folderPath + '/') &&
               !name.endsWith('/') && 
               !name.includes('metadata/') && 
               !name.endsWith('metadata.json');
      });

      console.log(`[StorageService] Found ${filteredFiles.length} files in bucket after filtering`);
      console.log('[StorageService] Files found:', filteredFiles.map(f => ({
        name: f.name,
        size: f.metadata.size
      })));

      // Get metadata for each file
      const filesWithMetadata = await Promise.all(
        filteredFiles.map(async file => {
          const [metadata] = await file.getMetadata();
          // Handle missing or empty description
          const description = metadata.metadata?.description;
          const hasDescription = description && description.trim().length > 0;
          return {
            file,
            metadata,
            description: hasDescription ? description.trim() : null
          };
        })
      );

      // Generate signed URLs for each file (valid for 1 hour)
      console.log('[StorageService] Generating signed URLs...');
      const signedUrls = await Promise.all(
        filesWithMetadata
          .map(async ({ file, metadata, description }) => {
            console.log(`[StorageService] Processing file: ${file.name}, description: ${description}`);
            const [url] = await file.getSignedUrl({
              version: 'v4',
              action: 'read',
              expires: Date.now() + 24 * 3600 * 1000 // 24 hours
            });

            console.log(`[StorageService] Generated signed URL for: ${file.name}`);
            return {
              name: file.name.split('/').pop(),
              url,
              contentType: metadata.contentType,
              size: parseInt(metadata.size, 10),
              description: description || null // Return null instead of empty string
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