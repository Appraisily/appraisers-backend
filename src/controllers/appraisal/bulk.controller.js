const bulkService = require('../../services/bulk.service');

class BulkController {
  static async getBulkImages(req, res) {
    const { id } = req.params;

    try {
      const fileList = await bulkService.getBulkImages(id);
      
      res.json({
        success: true,
        files: fileList
      });
    } catch (error) {
      console.error('[getBulkImages] Error:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error.message || 'Error retrieving bulk images',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  static async processBulkImages(req, res) {
    const { id } = req.params;
    const { main, age, signature } = req.body;

    try {
      const result = await bulkService.processBulkImages(id, { main, age, signature });

      res.json({
        success: true,
        message: 'Bulk images processed successfully',
        ...result
      });
    } catch (error) {
      console.error('Error processing bulk images:', error);
      res.status(error.message.includes('required') ? 400 : 500).json({
        success: false,
        message: error.message || 'Error processing bulk images'
      });
    }
  }
}

module.exports = BulkController;