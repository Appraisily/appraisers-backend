const { sheetsService } = require('../../services');
const { config } = require('../../config');

class AppraisalListController {
  static async getAppraisals(req, res) {
    try {
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!A2:K`
      );

      const appraisals = (values || []).map((row, index) => ({
        id: index + 2,
        date: row[0] || '',
        appraisalType: row[1] || '',
        identifier: row[2] || '',
        customerEmail: row[3] || '',
        customerName: row[4] || '',
        status: row[5] || '',
        wordpressUrl: row[6] || '',
        iaDescription: row[7] || '',
        customerDescription: row[8] || '',
        value: row[9] || '',
        appraisersDescription: row[10] || ''
      }));

      res.json(appraisals);
    } catch (error) {
      console.error('Error getting appraisals:', error);
      res.status(500).json({ success: false, message: 'Error getting appraisals.' });
    }
  }

  static async getCompletedAppraisals(req, res) {
    try {
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        'Completed Appraisals!A2:K'
      );

      const completedAppraisals = (values || []).map((row, index) => ({
        id: index + 2,
        date: row[0] || '',
        appraisalType: row[1] || '',
        identifier: row[2] || '',
        customerEmail: row[3] || '',
        customerName: row[4] || '',
        status: row[5] || '',
        wordpressUrl: row[6] || '',
        iaDescription: row[7] || '',
        customerDescription: row[8] || '',
        value: row[9] || '',
        appraisersDescription: row[10] || ''
      }));

      res.json(completedAppraisals);
    } catch (error) {
      console.error('Error getting completed appraisals:', error);
      res.status(500).json({ success: false, message: 'Error getting completed appraisals.' });
    }
  }

  static async cleanPendingAppraisals(req, res) {
    try {
      const sheetName = config.GOOGLE_SHEET_NAME;
      const spreadsheetId = config.PENDING_APPRAISALS_SPREADSHEET_ID;
      const range = `${sheetName}!A:K`; // Read all data including headers to find rows to delete

      const allData = await sheetsService.getValues(spreadsheetId, range);

      if (!allData || allData.length === 0) {
        return res.json({ success: true, message: 'Pending appraisals sheet is empty. Nothing to clean.', data: { removedCount: 0 } });
      }

      const rowsToDelete = [];
      // Start from 1 to skip header row if present, or adjust if sheet has no header and data starts at A1
      // Assuming data starts from row 2 (index 1 in the array) as per getAppraisals
      for (let i = allData.length - 1; i >= 1; i--) { // Iterate backwards to safely delete rows
        const row = allData[i];
        // Status is in column F (index 5)
        if (row && row[5] && row[5].toLowerCase() === 'moved to completed') {
          // Google Sheets API row numbers are 1-indexed
          // If allData[0] is header, then data row allData[i] corresponds to sheet row i+1.
          // If no header was fetched / allData starts directly with data then allData[i] is sheet row i+1
          // Given getAppraisals fetches from A2, it implies a header row at 1.
          // So, actual sheet row number is (i + 1) if allData includes header, or (i + startingRowIndex) if not.
          // Let's assume getValues returns data starting from the specified range, so if range is `Sheet!A2:K`, then allData[0] is row 2.
          // The `deleteRows` function in sheetsService likely needs 1-indexed sheet row numbers.
          // To be safe, let's get all rows from A1 (or whatever the actual start is), find the 0-indexed row indices to delete,
          // then map them to 1-indexed sheet row numbers for deletion.
          // For now, let's assume `i` from allData (if it started from A1) corresponds to sheet row `i+1`
          // If getValues for `SheetName!A:K` includes the header at allData[0], then data row `i` is sheet row `i+1`.
          rowsToDelete.push(i + 1); // Store 1-indexed row number
        }
      }

      if (rowsToDelete.length === 0) {
        return res.json({ success: true, message: 'No appraisals found with status \'Moved to Completed\'.', data: { removedCount: 0 } });
      }

      // The sheetsService.deleteRows will need to handle batch deletion of these 1-indexed rows.
      // It's more efficient to make one batch delete request.
      // The deleteRows function in SheetsService should be designed to take an array of row indices.
      // For simplicity, if such a batch delete isn't available, we might delete one by one (less ideal).
      // Let's assume sheetsService.deleteRows can handle an array of 1-indexed rows or we adapt.
      // A common pattern is to sort row indices in descending order before deleting to avoid index shifts.
      // rowsToDelete is already in descending order due to loop direction.
      
      // We need a batch delete operation. If `sheetsService.deleteRows` isn't batch, this needs adjustment.
      // Let's assume it takes a sheetId, sheetName, and an array of 1-based row indices to delete.
      // Or, more likely, it takes a start and end index for a contiguous range. 
      // If non-contiguous, multiple requests or a batchUpdate with deleteDimension requests are needed.
      
      // A robust way to delete multiple, potentially non-contiguous rows is using batchUpdate.
      // Each row deletion is a `deleteDimension` request targeting a specific row index.
      // These requests are made for the `ROWS` dimension.

      // Construct delete requests for batchUpdate
      const deleteRequests = rowsToDelete.map(rowIndex => ({
        deleteDimension: {
          range: {
            sheetId: await sheetsService.getSheetIdByName(spreadsheetId, sheetName), // Helper to get numeric sheetId
            dimension: 'ROWS',
            startIndex: rowIndex - 1, // 0-indexed for API
            endIndex: rowIndex // exclusive end index
          }
        }
      }));

      await sheetsService.batchUpdate(spreadsheetId, deleteRequests);

      res.json({ 
        success: true, 
        message: `Successfully removed ${rowsToDelete.length} completed appraisal(s) from the pending list.`,
        data: { removedCount: rowsToDelete.length }
      });

    } catch (error) {
      console.error('Error cleaning pending appraisals:', error);
      res.status(500).json({ success: false, message: 'Error cleaning pending appraisals.', details: error.message });
    }
  }
}

module.exports = AppraisalListController;