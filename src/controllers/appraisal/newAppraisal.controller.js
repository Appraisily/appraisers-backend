const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs').promises;
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { sheetsService } = require('../../services');
const { config } = require('../../config');

/**
 * Controller for creating new appraisals
 */
const newAppraisalController = {
  /**
   * Create a new appraisal by adding it to Google Sheets and forwarding to Payment Processor
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  createNewAppraisal: async (req, res) => {
    try {
      console.log('📝 Creating new appraisal from direct submission');
      
      // Validate required fields
      const { description, customerName, customerEmail, sessionId, appraisalType } = req.body;
      
      if (!description) {
        return res.status(400).json({ 
          success: false, 
          message: 'Description is required' 
        });
      }
      
      if (!customerName) {
        return res.status(400).json({ 
          success: false, 
          message: 'Customer name is required' 
        });
      }
      
      if (!customerEmail) {
        return res.status(400).json({ 
          success: false, 
          message: 'Customer email is required' 
        });
      }
      
      if (!sessionId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Session ID is required' 
        });
      }
      
      if (!req.files || !req.files.mainImage) {
        return res.status(400).json({ 
          success: false, 
          message: 'Main image is required' 
        });
      }
      
      // Check for valid appraisal type
      const validTypes = ['Regular', 'Quick', 'Certificate'];
      if (!validTypes.includes(appraisalType)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid appraisal type. Must be one of: Regular, Quick, Certificate' 
        });
      }

      console.log('✅ All required fields are present');
      
      // Extract files from request
      const mainImage = req.files.mainImage;
      const signatureImage = req.files.signatureImage || null;
      const ageImage = req.files.ageImage || null;
      
      // Prepare data for Google Sheets
      const currentDate = new Date().toLocaleDateString('en-US'); // Format: MM/DD/YYYY
      const appraisalData = {
        date: currentDate,
        appraisalType,
        identifier: sessionId,
        customerEmail,
        customerName,
        status: 'Pending',
        wordpressUrl: '',
        iaDescription: '',
        customerDescription: description,
        value: '',
        appraisersDescription: ''
      };
      
      // Save to Google Sheets - requires await to get the row ID
      console.log('📋 Adding appraisal to Google Sheets');
      const appraisalId = await sheetsService.addPendingAppraisal(appraisalData);
      
      if (!appraisalId) {
        throw new Error('Failed to add appraisal to Google Sheets');
      }
      
      console.log(`✅ Added to Google Sheets with ID: ${appraisalId}`);
      
      // Save files to temp location
      const tempDir = path.join(os.tmpdir(), 'appraisal-images-' + Date.now());
      await fs.mkdir(tempDir, { recursive: true });
      
      const mainImagePath = path.join(tempDir, `main-${Date.now()}.${getExtension(mainImage.name)}`);
      await fs.writeFile(mainImagePath, mainImage.data);
      
      const imagePaths = { main: mainImagePath };
      
      // Handle optional images
      if (signatureImage) {
        const signatureImagePath = path.join(tempDir, `signature-${Date.now()}.${getExtension(signatureImage.name)}`);
        await fs.writeFile(signatureImagePath, signatureImage.data);
        imagePaths.signature = signatureImagePath;
      }
      
      if (ageImage) {
        const ageImagePath = path.join(tempDir, `age-${Date.now()}.${getExtension(ageImage.name)}`);
        await fs.writeFile(ageImagePath, ageImage.data);
        imagePaths.age = ageImagePath;
      }
      
      // Create form data to send to Payment Processor
      const formData = new FormData();
      formData.append('session_id', sessionId);
      formData.append('description', description);
      formData.append('customer_email', customerEmail);
      formData.append('customer_name', customerName);
      
      // Add files to form data
      formData.append('main', await fs.readFile(imagePaths.main), {
        filename: path.basename(imagePaths.main),
        contentType: getContentType(imagePaths.main)
      });
      
      if (imagePaths.signature) {
        formData.append('signature', await fs.readFile(imagePaths.signature), {
          filename: path.basename(imagePaths.signature),
          contentType: getContentType(imagePaths.signature)
        });
      }
      
      if (imagePaths.age) {
        formData.append('age', await fs.readFile(imagePaths.age), {
          filename: path.basename(imagePaths.age),
          contentType: getContentType(imagePaths.age)
        });
      }
      
      // Send to Payment Processor API
      console.log('🚀 Sending appraisal to Payment Processor');
      const paymentProcessorUrl = 'https://payment-processor-856401495068.us-central1.run.app/api/appraisals';
      
      const paymentProcessorResponse = await axios.post(paymentProcessorUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          'Origin': config.ALLOWED_ORIGINS?.split(',')[0] || 'https://appraisers.appraisily.com'
        }
      });
      
      console.log('✅ Payment Processor response:', paymentProcessorResponse.data);
      
      // Clean up temp files
      for (const imagePath of Object.values(imagePaths)) {
        await fs.unlink(imagePath);
      }
      
      try {
        await fs.rmdir(tempDir);
      } catch (cleanupError) {
        console.warn('Warning: Could not remove temp directory:', cleanupError.message);
      }
      
      // Return success response
      return res.status(200).json({
        success: true,
        message: 'Appraisal created successfully',
        data: {
          id: appraisalId,
          sessionId
        }
      });
    } catch (error) {
      console.error('❌ Error creating new appraisal:', error);
      
      return res.status(500).json({
        success: false,
        message: `Failed to create appraisal: ${error.message}`
      });
    }
  }
};

/**
 * Helper function to get file extension
 * @param {string} filename - Filename
 * @returns {string} File extension
 */
function getExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

/**
 * Helper function to get content type based on file extension
 * @param {string} filename - Filename
 * @returns {string} Content type
 */
function getContentType(filename) {
  const ext = getExtension(filename);
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

module.exports = newAppraisalController; 