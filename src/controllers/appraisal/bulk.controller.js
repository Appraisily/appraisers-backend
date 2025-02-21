const { sheetsService } = require('../../services');
const storageService = require('../../services/storage.service');
const { config } = require('../../config');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');

class BulkController {
  static async getBulkImages(req, res) {
    const { id } = req.params;

    try {
      // Get the GCS folder path from column G
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!G${id}`
      );

      if (!values?.[0]?.[0]) {
        return res.status(404).json({
          success: false,
          message: 'GCS folder path not found for this appraisal'
        });
      }

      const gcsPath = values[0][0];
      
      // List files and generate signed URLs
      const files = await storageService.listFiles(gcsPath);

      res.json({
        success: true,
        files
      });
    } catch (error) {
      console.error('Error getting bulk images:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving bulk images'
      });
    }
  }

  static async processBulkImages(req, res) {
    const { id } = req.params;
    const { main, age, signature } = req.body;

    // Validate main image is required
    try {
      if (!main) {
        return res.status(400).json({
          success: false,
          message: 'Main image is required'
        });
      }

      // Get row data from sheets
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!A${id}:E${id}`
      );

      if (!values?.[0]) {
        return res.status(404).json({
          success: false,
          message: 'Appraisal not found'
        });
      }

      // Generate session_id with single_ prefix and random UUID
      const session_id = `single_${uuidv4()}`;

      // Get current date in YYYY-MM-DD format
      const currentDate = new Date().toISOString().split('T')[0];

      // Get metadata file from GCS
      const gcsPath = values[0][6]; // Column G contains GCS path
      const metadataFiles = await storageService.listFiles(`${gcsPath}/metadata`);
      const metadataFile = metadataFiles.find(f => f.name === 'metadata.json');
      
      if (!metadataFile) {
        throw new Error('Metadata file not found');
      }

      // Fetch and parse metadata
      const metadataResponse = await fetch(metadataFile.url);
      const metadata = await metadataResponse.json();
      
      // Use appraisal type directly from metadata
      const appraisalType = metadata.appraisal_type;

      // Extract customer info from original row
      const [date, , , customerEmail, customerName] = values[0];

      // Add new row to Pending Appraisals sheet
      const newRow = [
        date,                    // Date (from original row)
        appraisalType,          // Appraisal Type (directly from metadata)
        session_id,              // Identifier
        customerEmail,           // Customer Email (from original row)
        customerName,            // Customer Name (from original row)
        'Pending',               // Status
        '',                      // WordPress URL (will be filled by payment processor)
        '',                      // IA Description
        '',                      // Customer Description
        '',                      // Value
        '',                      // Appraiser's Description
        '',                      // Merged Description
        '',                      // PDF Link
        '',                      // Doc Link
        JSON.stringify({         // Images
          main: main || '',
          ...(age && { age }),
          ...(signature && { signature })
        })
      ];

      // Get the next available row number
      const allValues = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!A:A`
      );
      const nextRow = allValues.length + 1;

      // Add the new row
      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!A${nextRow}:O${nextRow}`,
        [newRow]
      );

      console.log(`Added new individual appraisal record in row ${nextRow}`);

      // Prepare form data
      const formData = new FormData();
      formData.append('session_id', session_id);
      formData.append('customer_email', customerEmail);
      formData.append('customer_name', customerName || '');

      // Always append main image
      const mainResponse = await fetch(main);
      if (!mainResponse.ok) {
        throw new Error('Failed to fetch main image');
      }
      const mainBuffer = await mainResponse.buffer();
      formData.append('main', mainBuffer, 'main.jpg');

      // Optionally append age and signature images
      if (age) {
        const ageResponse = await fetch(age);
        if (ageResponse.ok) {
          const ageBuffer = await ageResponse.buffer();
          formData.append('age', ageBuffer, 'age.jpg');
        }
      }

      if (signature) {
        const signatureResponse = await fetch(signature);
        if (signatureResponse.ok) {
          const signatureBuffer = await signatureResponse.buffer();
          formData.append('signature', signatureBuffer, 'signature.jpg');
        }
      }

      // Send to payment processor
      const response = await fetch('https://payment-processor-856401495068.us-central1.run.app/api/appraisals', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Payment processor error: ${error}`);
      }

      const result = await response.json();

      res.json({
        success: true,
        message: 'Bulk images processed successfully',
        rowId: nextRow,
        result
      });

    } catch (error) {
      console.error('Error processing bulk images:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error processing bulk images'
      });
    }
  }
}

module.exports = BulkController;