// Previous content remains the same, adding new method:

async function getCompletedAppraisals(req, res) {
  try {
    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      'Completed Appraisals!A2:H'
    );

    const completedAppraisals = (values || []).map((row, index) => ({
      id: index + 2,
      date: row[0] || '',
      appraisalType: row[1] || '',
      identifier: row[2] || '',
      status: row[5] || '',
      wordpressUrl: row[6] || '',
      iaDescription: row[7] || '',
    }));

    res.json(completedAppraisals);
  } catch (error) {
    console.error('Error getting completed appraisals:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting completed appraisals.' 
    });
  }
}