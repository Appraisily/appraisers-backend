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

  static async cleanupMovedToCompleted(req, res) {
    try {
      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME || 'Pending Appraisals'}!A2:F`
      );
      
      if (!values || values.length === 0) {
        return res.json({ 
          success: true, 
          message: 'No pending appraisals found to clean up.', 
          cleanedCount: 0 
        });
      }

      const movedRows = [];
      values.forEach((row, index) => {
        if (row[5] === 'Moved to Completed') {
          movedRows.push(index + 2); // +2 because index is 0-based and rows start at 2 (after header)
        }
      });

      if (movedRows.length === 0) {
        return res.json({ 
          success: true, 
          message: 'No "Moved to Completed" entries found.', 
          cleanedCount: 0 
        });
      }

      console.log(`Found ${movedRows.length} "Moved to Completed" entries to clean up:`, movedRows);
      
      // Sort rows in descending order to avoid index shifting when deleting multiple rows
      movedRows.sort((a, b) => b - a);
      
      // Get sheet ID for the pending appraisals sheet
      await sheetsService.initialize();
      if (!sheetsService.sheets) {
        throw new Error('Sheets API not initialized');
      }
      
      // Get all sheets in the spreadsheet to find the ID of our sheet
      const sheetsResponse = await sheetsService.sheets.spreadsheets.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      });
      
      const pendingSheetName = config.GOOGLE_SHEET_NAME || 'Pending Appraisals';
      const sheet = sheetsResponse.data.sheets.find(
        s => s.properties.title === pendingSheetName
      );
      
      if (!sheet) {
        throw new Error(`Sheet "${pendingSheetName}" not found`);
      }
      
      const sheetId = sheet.properties.sheetId;
      
      // Create delete dimension requests for each row
      const requests = movedRows.map(rowIndex => ({
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1, // Convert to 0-based index
            endIndex: rowIndex // The end index is exclusive
          }
        }
      }));
      
      // Execute batch update to delete all rows at once
      await sheetsService.sheets.spreadsheets.batchUpdate({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        requestBody: {
          requests: requests
        }
      });

      res.json({ 
        success: true, 
        message: `Successfully deleted ${movedRows.length} "Moved to Completed" entries.`,
        cleanedCount: movedRows.length
      });
    } catch (error) {
      console.error('Error cleaning up moved to completed entries:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error cleaning up moved to completed entries.' 
      });
    }
  }

  static async removeAppraisal(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ 
          success: false, 
          message: 'Appraisal ID is required' 
        });
      }

      console.log(`🗑️ Removing appraisal with ID: ${id}`);
      
      // 1. Get the row data from the Pending Appraisals sheet
      const pendingSheetName = config.GOOGLE_SHEET_NAME || 'Pending Appraisals';
      const rowData = await sheetsService.getAppraisalRow(id, pendingSheetName);
      
      if (!rowData || rowData.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: `Appraisal with ID ${id} not found` 
        });
      }
      
      // 2. Add the row to the Removed Appraisals sheet
      const removedSheetName = 'Removed Appraisals';
      
      // Get the next available row in the Removed Appraisals sheet
      await sheetsService.initialize();
      if (!sheetsService.sheets) {
        throw new Error('Sheets API not initialized');
      }
      
      const response = await sheetsService.sheets.spreadsheets.values.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        range: `${removedSheetName}!A:A`,
        valueRenderOption: 'UNFORMATTED_VALUE'
      });
      
      const values = response.data.values || [];
      const nextRow = values.length + 1; // Add 1 since rows are 1-indexed
      
      // Add the row to the Removed Appraisals sheet
      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${removedSheetName}!A${nextRow}:N${nextRow}`,
        [rowData]
      );
      
      // 3. Delete the row from the Pending Appraisals sheet
      // First, get sheet ID for the pending sheet
      const sheetsResponse = await sheetsService.sheets.spreadsheets.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      });
      
      const sheet = sheetsResponse.data.sheets.find(
        s => s.properties.title === pendingSheetName
      );
      
      if (!sheet) {
        throw new Error(`Sheet "${pendingSheetName}" not found`);
      }
      
      const sheetId = sheet.properties.sheetId;
      
      // Create delete dimension request for the row
      const request = {
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: 'ROWS',
            startIndex: parseInt(id) - 1, // Convert to 0-based index
            endIndex: parseInt(id) // The end index is exclusive
          }
        }
      };
      
      // Execute batch update to delete the row
      await sheetsService.sheets.spreadsheets.batchUpdate({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
        requestBody: {
          requests: [request]
        }
      });
      
      res.json({ 
        success: true, 
        message: `Successfully removed appraisal with ID ${id}` 
      });
    } catch (error) {
      console.error('Error removing appraisal:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error removing appraisal.',
        error: error.message
      });
    }
  }
}

module.exports = AppraisalListController;