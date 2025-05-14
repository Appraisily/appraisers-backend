const express = require('express');
const router = express.Router();
const GeminiDocsService = require('../services/gemini-docs.service');
const GoogleDocsService = require('../services/google-docs.service');
const WordPressService = require('../services/wordpress.service');
const { createLogger } = require('../utils/logger');

const logger = createLogger('GeminiRoutes');
const googleDocsService = new GoogleDocsService();
const wordpressService = new WordPressService();
const geminiDocsService = new GeminiDocsService(googleDocsService);

// Initialize services
(async () => {
  try {
    await Promise.all([
      googleDocsService.initialize(),
      wordpressService.initialize(),
      geminiDocsService.initialize()
    ]);
    logger.info('Gemini document services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Gemini document services:', error);
  }
})();

/**
 * Generate document with Gemini AI (POST endpoint)
 * @route POST /api/generate-gemini-doc
 */
router.post('/', async (req, res) => {
  try {
    const { postId, outputFormat = 'docs' } = req.body;
    
    if (!postId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: postId is required'
      });
    }
    
    logger.info(`Received request to generate ${outputFormat} using Gemini for WordPress post ${postId}`);
    
    // Generate the document using Gemini
    const result = await geminiDocsService.generateDocFromWordPressPost(
      postId,
      wordpressService,
      { convertToPdf: outputFormat === 'pdf' }
    );
    
    // Return appropriate response based on format
    if (outputFormat === 'pdf') {
      res.contentType('application/pdf');
      res.send(result.fileContent);
    } else {
      res.json({
        success: true,
        docUrl: result.docUrl,
        docId: result.docId,
        message: 'Gemini-powered Google Doc created successfully',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('Error generating Gemini-powered document:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * Generate document with Gemini AI (GET endpoint with URL parameters)
 * @route GET /api/generate-gemini-doc/:postId
 */
router.get('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const outputFormat = req.query.format || 'docs'; // Get format from query string
    
    logger.info(`Received request to generate ${outputFormat} using Gemini for WordPress post ${postId} (via GET)`);
    
    // Generate the document using Gemini
    const result = await geminiDocsService.generateDocFromWordPressPost(
      postId,
      wordpressService,
      { convertToPdf: outputFormat === 'pdf' }
    );
    
    // Return appropriate response based on format
    if (outputFormat === 'pdf') {
      res.contentType('application/pdf');
      res.send(result.fileContent);
    } else {
      res.json({
        success: true,
        docUrl: result.docUrl,
        docId: result.docId,
        message: 'Gemini-powered Google Doc created successfully',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('Error generating Gemini-powered document:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

module.exports = router; 