const appraisalService = require('./appraisal.service');
const { sheetsService } = require('../../services');
const { config } = require('../../config');

class UpdatePendingController {
    static async updatePendingAppraisal(req, res) {
        try {
            const {
                session_id,
                customer_email,
                customer_name,
                description,
                payment_id,
                wordpress_url,
                images
            } = req.body;

            // Validate required fields
            if (!session_id || !customer_email || !wordpress_url || !images) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            // Get next available row in spreadsheet
            const values = await sheetsService.getValues(
                config.PENDING_APPRAISALS_SPREADSHEET_ID,
                `${config.GOOGLE_SHEET_NAME}!A:A`
            );
            const nextRow = values.length + 1;

            // Prepare row data
            const currentDate = new Date().toISOString().split('T')[0];
            const rowData = [
                [
                    currentDate,           // Date
                    'RegularArt',         // Type
                    payment_id || '',      // Identifier
                    customer_email,        // Customer Email
                    customer_name || '',   // Customer Name
                    'Pending',            // Status
                    wordpress_url,         // WordPress URL
                    '',                    // IA Description
                    description || ''      // Customer Description
                ]
            ];

            // Update spreadsheet
            await sheetsService.updateValues(
                config.PENDING_APPRAISALS_SPREADSHEET_ID,
                `${config.GOOGLE_SHEET_NAME}!A${nextRow}:I${nextRow}`,
                rowData
            );

            res.json({
                success: true,
                message: 'Pending appraisal updated successfully'
            });
        } catch (error) {
            console.error('Error updating pending appraisal:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = UpdatePendingController;