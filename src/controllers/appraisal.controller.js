// Previous imports remain the same...

class AppraisalController {
  // Previous methods remain the same...

  static async setValue(req, res) {
    const { id } = req.params;
    const { appraisalValue, description } = req.body;

    try {
      // Update Google Sheets
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

      const wordpressUrl = values[0][0];
      const postId = new URL(wordpressUrl).searchParams.get('post');

      // Update WordPress
      await wordpressService.updatePost(postId, {
        acf: { value: appraisalValue }
      });

      res.json({
        success: true,
        message: 'Appraisal value updated successfully'
      });
    } catch (error) {
      console.error('Error updating appraisal value:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error updating appraisal value'
      });
    }
  }
}

module.exports = {
  // Previous exports remain the same...
  setValue: AppraisalController.setValue
};