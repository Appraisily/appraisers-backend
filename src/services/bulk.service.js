const { sheetsService } = require('../services');
const { config } = require('../config');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const { extractImageMetadata } = require('../utils/imageUtils');
const { extractBulkInfo } = require('../utils/appraisalUtils');

class BulkService {
  async getBulkImages(id) {
    console.log(`[getBulkImages] Starting request for appraisal ID: ${id}`);

    const values = await sheetsService.getValues( 
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!B${id}:G${id}`
    );

    if (!values?.[0]?.[0]) {
      throw new Error('Bulk identifier not found for this appraisal');
    }

    const bulkIdentifier = values[0][0];
    const wordpressUrl = values[0][5];
    const postId = new URL(wordpressUrl).searchParams.get('post');

    if (!postId) {
      throw new Error('Invalid WordPress URL');
    }

    // List files from GCS bucket
    const bucketPath = `${config.GCS_BUCKET_NAME}/bulk/${postId}`;
    const files = await storageService.listFiles(bucketPath);

    console.log(`[getBulkImages] Found ${files.length} files for post ${postId}`);
    return files;
  }

  async createNewAppraisalRow(originalRow, session_id, appraisalType, combinedDescription, images) {
    const [date, , , customerEmail, customerName] = originalRow;

    return [
      date,                    // Date
      appraisalType,          // Appraisal Type
      session_id,             // Identifier
      customerEmail,          // Customer Email
      customerName,           // Customer Name
      'Pending',              // Status
      '',                     // WordPress URL
      '',                     // IA Description
      combinedDescription,    // Customer Description
      '',                     // Value
      '',                     // Appraiser's Description
      '',                     // Merged Description
      '',                     // PDF Link
      '',                     // Doc Link
      JSON.stringify(images)  // Images
    ];
  }

  async sendToPaymentProcessor(session_id, customerEmail, customerName, images) {
    const formData = new FormData();
    formData.append('session_id', session_id);
    formData.append('customer_email', customerEmail);
    formData.append('customer_name', customerName || '');

    // Process images
    for (const [type, url] of Object.entries(images)) {
      if (url) {
        const response = await fetch(url);
        if (response.ok) {
          const buffer = await response.buffer();
          formData.append(type, buffer, `${type}.jpg`);
        }
      }
    }

    const response = await fetch('https://payment-processor-856401495068.us-central1.run.app/api/appraisals', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Payment processor error: ${error}`);
    }

    return response.json();
  }

  async processBulkImages(id, images) {
    if (!images.main) {
      throw new Error('Main image is required');
    }

    // Get row data from sheets
    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!A${id}:G${id}`
    );

    if (!values?.[0]) {
      throw new Error('Appraisal not found');
    }

    const bulkIdentifier = values[0][1]; // Column B contains bulk identifier
    const { type: appraisalType } = extractBulkInfo(bulkIdentifier);

    const session_id = `single_${uuidv4()}`;
    const descriptions = await extractImageMetadata(images);
    const combinedDescription = descriptions.join(' ');

    // Create and add new row
    const newRow = await this.createNewAppraisalRow(
      values[0],
      session_id,
      appraisalType,
      combinedDescription,
      images
    );

    // Get next available row and insert
    const allValues = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!A:A`
    );
    const nextRow = allValues.length + 1;

    await sheetsService.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!A${nextRow}:O${nextRow}`,
      [newRow]
    );

    // Process payment
    const result = await this.sendToPaymentProcessor(
      session_id,
      values[0][3], // customerEmail
      values[0][4], // customerName
      images
    );

    return {
      rowId: nextRow,
      result
    };
  }
}

module.exports = new BulkService();