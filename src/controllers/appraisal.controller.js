// ... existing imports and code ...

class AppraisalController {
  // ... existing methods ...

  static async processWorker(req, res) {
    const { id, appraisalValue, description } = req.body;

    if (!id || !appraisalValue || !description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: id, appraisalValue, description'
      });
    }

    try {
      // Update appraisal value and description
      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!J${id}:K${id}`,
        [[appraisalValue, description]]
      );

      // Get WordPress URL
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!G${id}`
      );

      const wordpressUrl = values?.[0]?.[0];
      if (!wordpressUrl) {
        throw new Error('WordPress URL not found');
      }

      const postId = new URL(wordpressUrl).searchParams.get('post');
      if (!postId) {
        throw new Error('WordPress post ID not found');
      }

      // Update WordPress value
      await wordpressService.updatePost(postId, {
        acf: { value: appraisalValue }
      });

      // Generate and merge descriptions
      const post = await wordpressService.getPost(postId);
      const mainImageUrl = post.acf?.main;
      
      if (mainImageUrl) {
        const iaDescription = await openaiService.generateDescription(mainImageUrl);
        
        // Save IA description
        await sheetsService.updateValues(
          config.PENDING_APPRAISALS_SPREADSHEET_ID,
          `${config.GOOGLE_SHEET_NAME}!H${id}`,
          [[iaDescription]]
        );

        // Update post title
        await wordpressService.updatePost(postId, {
          title: iaDescription
        });
      }

      // Insert template
      const appraisalType = post.acf?.type || 'RegularArt';
      let content = post.content?.rendered || '';

      if (!content.includes('[pdf_download]')) {
        content += '\n[pdf_download]';
      }

      if (!content.includes(`[AppraisalTemplates type="${appraisalType}"]`)) {
        content += `\n[AppraisalTemplates type="${appraisalType}"]`;
      }

      await wordpressService.updatePost(postId, {
        content,
        acf: { shortcodes_inserted: true }
      });

      // Send email to customer
      const customerDetails = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!D${id}:E${id}`
      );

      if (customerDetails?.[0]) {
        const [customerEmail, customerName] = customerDetails[0];
        
        if (customerEmail) {
          await emailService.sendAppraisalCompletedEmail(customerEmail, customerName, {
            value: appraisalValue,
            description,
            pdfLink: post.acf?.pdflink,
            publicUrl: post.link
          });
        }
      }

      // Mark as completed
      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!F${id}`,
        [['Completed']]
      );

      res.json({
        success: true,
        message: 'Appraisal processed successfully'
      });
    } catch (error) {
      console.error('Error processing appraisal:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error processing appraisal'
      });
    }
  }
}

module.exports = AppraisalController;