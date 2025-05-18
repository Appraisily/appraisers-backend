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
        `${config.GOOGLE_SHEET_NAME || 'Pending Appraisals'}!A2:N`
      );
      
      if (!values || values.length === 0) {
        console.log('No pending appraisals found to clean up.');
        return res.json({ 
          success: true, 
          message: 'No pending appraisals found to clean up.', 
          cleanedCount: 0 
        });
      }

      console.log(`Found ${values.length} total entries in the pending appraisals sheet.`);
      
      // Debug: Log all statuses to understand what we're working with
      console.log('Current status values in the sheet:');
      const statusValues = values.map(row => row[5] || 'empty');
      console.log(statusValues);

      // Initialize sheets API
      await sheetsService.initialize();
      if (!sheetsService.sheets) {
        throw new Error('Sheets API not initialized');
      }
      
      // Get all sheets in the spreadsheet
      const sheetsResponse = await sheetsService.sheets.spreadsheets.get({
        spreadsheetId: config.PENDING_APPRAISALS_SPREADSHEET_ID,
      });
      
      const pendingSheetName = config.GOOGLE_SHEET_NAME || 'Pending Appraisals';
      const completedSheetName = config.COMPLETED_SHEET_NAME || 'Completed Appraisals';
      
      const pendingSheet = sheetsResponse.data.sheets.find(
        s => s.properties.title === pendingSheetName
      );
      
      if (!pendingSheet) {
        throw new Error(`Sheet "${pendingSheetName}" not found`);
      }
      
      const pendingSheetId = pendingSheet.properties.sheetId;
      
      // Check if the Completed sheet exists
      const completedSheetExists = sheetsResponse.data.sheets.some(
        s => s.properties.title === completedSheetName
      );
      
      if (!completedSheetExists) {
        console.warn(`Warning: Completed sheet "${completedSheetName}" not found. Items with "COMPLETED" status will only be deleted, not moved.`);
      }

      // Get the next available row in the Completed Appraisals sheet (if needed)
      let nextCompletedRow = 0;
      if (completedSheetExists) {
        const completedValues = await sheetsService.getValues(
          config.PENDING_APPRAISALS_SPREADSHEET_ID,
          `${completedSheetName}!A:A`,
          'UNFORMATTED_VALUE'
        );
        nextCompletedRow = (completedValues || []).length + 1; // Add 1 since rows are 1-indexed
        console.log(`Next available row in Completed sheet: ${nextCompletedRow}`);
      }

      const movedRows = [];
      const completedRows = [];
      
      values.forEach((row, index) => {
        // Case insensitive check for statuses
        const status = String(row[5] || '').toLowerCase();
        
        // Debug log to see how the status is being parsed
        if (row[5]) {
          console.log(`Row ${index + 2}: Status = "${row[5]}", Lowercase = "${status}"`);
        }
        
        if (status === 'moved to completed' || status.includes('removed')) {
          console.log(`✅ Row ${index + 2} with status "${row[5]}" will be removed`);
          movedRows.push(index + 2); // +2 because index is 0-based and rows start at 2 (after header)
        }
        // Check for "COMPLETED" status to move to completed sheet
        else if (status.includes('completed') && !status.includes('moved to')) {
          console.log(`✅ Row ${index + 2} with status "${row[5]}" will be moved to Completed sheet`);
          completedRows.push({
            rowIndex: index + 2,
            data: row
          });
          movedRows.push(index + 2); // Also add to rows to be removed
        }
      });

      // Handle rows to be moved to Completed sheet
      if (completedRows.length > 0 && completedSheetExists) {
        console.log(`Moving ${completedRows.length} rows to Completed sheet...`);
        
        // Process each completed row
        for (const item of completedRows) {
          try {
            // Add the row to the Completed sheet
            await sheetsService.updateValues(
              config.PENDING_APPRAISALS_SPREADSHEET_ID,
              `${completedSheetName}!A${nextCompletedRow}:N${nextCompletedRow}`,
              [item.data]
            );
            console.log(`Row ${item.rowIndex} successfully moved to Completed sheet row ${nextCompletedRow}`);
            nextCompletedRow++; // Increment for next row
          } catch (moveError) {
            console.error(`Error moving row ${item.rowIndex} to Completed sheet:`, moveError);
            // Continue with the next item, don't stop the process
          }
        }
      }

      if (movedRows.length === 0) {
        console.log('No entries matched the cleanup criteria.');
        return res.json({ 
          success: true, 
          message: 'No "Moved to Completed", "COMPLETED", or "REMOVED" entries found.', 
          cleanedCount: 0 
        });
      }

      console.log(`Found ${movedRows.length} entries to clean up:`, movedRows);
      
      // Sort rows in descending order to avoid index shifting when deleting multiple rows
      movedRows.sort((a, b) => b - a);
      
      // Create delete dimension requests for each row
      const requests = movedRows.map(rowIndex => ({
        deleteDimension: {
          range: {
            sheetId: pendingSheetId,
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
        message: `Successfully processed ${movedRows.length} entries (${completedRows.length} moved to Completed sheet).`,
        cleanedCount: movedRows.length
      });
    } catch (error) {
      console.error('Error cleaning up entries:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error cleaning up entries.' 
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

  /**
   * Move a pending appraisal to the completed sheet
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  static async movePendingToCompleted(req, res) {
    const { id } = req.params;

    try {
      console.log(`🔄 Moving pending appraisal ${id} to Completed Appraisals sheet...`);
      
      // Check if the appraisal exists in the pending sheet
      const appraisalData = await sheetsService.getAppraisalRow(id);
      
      if (!appraisalData) {
        console.error(`❌ Appraisal ${id} not found in the pending appraisals sheet`);
        return res.status(404).json({
          success: false,
          message: 'Appraisal not found in the pending appraisals sheet'
        });
      }

      // Call the moveToCompleted function from sheets service
      // This will copy the row to the completed sheet and update status in pending sheet
      await sheetsService.moveToCompleted(id);
      
      console.log(`✅ Successfully moved appraisal ${id} to Completed Appraisals sheet`);
      
      return res.json({
        success: true,
        message: 'Appraisal successfully moved to completed sheet'
      });
    } catch (error) {
      console.error('Error moving appraisal to completed:', error);
      return res.status(500).json({
        success: false,
        message: 'Error moving appraisal to completed sheet',
        error: error.message
      });
    }
  }
}

module.exports = AppraisalListController;