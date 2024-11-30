const { 
  openaiService, 
  sheetsService, 
  emailService, 
  wordpressService 
} = require('../../services');
const { config } = require('../../config');

class UpdatePendingController {
    static async updatePendingAppraisal(req, res) {
        const requestId = Math.random().toString(36).substring(7);
        console.log(`[${requestId}] ⭐ Starting update-pending-appraisal request`);
        console.log(`[${requestId}] Headers:`, JSON.stringify(req.headers, null, 2));
        console.log(`[${requestId}] Raw Body:`, JSON.stringify(req.body, null, 2));

        try {
            // Verify shared secret
            const incomingSecret = req.headers['x-shared-secret'];
            if (incomingSecret !== config.SHARED_SECRET) {
                console.error(`[${requestId}] ❌ Authentication failed - Invalid shared secret`);
                return res.status(403).json({ 
                    success: false, 
                    message: 'Forbidden: Invalid shared secret.' 
                });
            }
            console.log(`[${requestId}] ✅ Shared secret verified`);

            // Map fields from WordPress payload
            const { 
                session_id,
                customer_email,
                customer_name,
                description = '',  // Optional field
                post_edit_url,    // Changed from wordpress_url to match WordPress
                images,
                payment_id        // New field from WordPress
            } = req.body;

            console.log(`[${requestId}] 🔄 Mapped fields from request:`, {
                session_id,
                customer_email,
                customer_name,
                description: description || '[not provided]',
                post_edit_url,
                payment_id,
                images: images ? Object.keys(images) : 'no images'
            });

            // Validate required fields
            const validationErrors = [];
            if (!session_id) validationErrors.push('session_id is required');
            if (!customer_email) validationErrors.push('customer_email is required');
            if (!post_edit_url) validationErrors.push('post_edit_url is required');
            if (!images || typeof images !== 'object') validationErrors.push('images object is required');
            if (!images?.main) validationErrors.push('main image URL is required');

            if (validationErrors.length > 0) {
                console.error(`[${requestId}] ❌ Validation errors:`, validationErrors);
                return res.status(400).json({ 
                    success: false, 
                    message: 'Missing required fields', 
                    errors: validationErrors 
                });
            }
            console.log(`[${requestId}] ✅ Request validation passed`);

            // Extract post_id from post_edit_url
            let post_id;
            try {
                const url = new URL(post_edit_url);
                post_id = url.searchParams.get('post');
                if (!post_id) throw new Error('Could not extract post ID from URL');
                console.log(`[${requestId}] ✅ Extracted post_id: ${post_id}`);
            } catch (error) {
                console.error(`[${requestId}] ❌ Error extracting post_id:`, error);
                return res.status(400).json({
                    success: false,
                    message: 'Invalid WordPress URL format'
                });
            }

            // Send immediate response
            res.json({ 
                success: true, 
                message: 'Appraisal status update initiated.' 
            });
            console.log(`[${requestId}] ✅ Sent immediate response to client`);

            // Process in background
            (async () => {
                try {
                    console.log(`[${requestId}] 🔄 Starting background processing`);

                    // Initialize services if needed
                    await Promise.all([
                        openaiService.initialize(),
                        wordpressService.initialize(),
                        sheetsService.initialize(),
                        emailService.initialize()
                    ]);
                    console.log(`[${requestId}] ✅ Services initialized`);

                    // Generate AI description
                    console.log(`[${requestId}] 🔄 Generating AI description for image:`, images.main);
                    const iaDescription = await openaiService.generateDescription(
                        images.main,
                        images.signature,
                        images.age
                    );
                    console.log(`[${requestId}] ✅ Generated AI description:`, iaDescription);

                    // Update WordPress title
                    console.log(`[${requestId}] 🔄 Updating WordPress title for post:`, post_id);
                    await wordpressService.updatePost(post_id, {
                        title: `Preliminary Analysis: ${iaDescription}`
                    });
                    console.log(`[${requestId}] ✅ WordPress title updated`);

                    // Update Google Sheets
                    console.log(`[${requestId}] 🔄 Updating Google Sheets for session:`, session_id);
                    const sheetData = await UpdatePendingController.updateGoogleSheets(
                        session_id, 
                        iaDescription, 
                        description, 
                        images
                    );
                    console.log(`[${requestId}] ✅ Google Sheets updated`);

                    // Send email notification
                    console.log(`[${requestId}] 🔄 Sending email notification to:`, customer_email);
                    await emailService.sendAppraisalUpdateEmail(
                        customer_email,
                        customer_name || sheetData.customer_name,
                        description,
                        iaDescription
                    );
                    console.log(`[${requestId}] ✅ Email notification sent`);

                    console.log(`[${requestId}] ✅ Background processing completed successfully`);
                } catch (error) {
                    console.error(`[${requestId}] ❌ Background processing error:`, error);
                    console.error(`[${requestId}] Stack trace:`, error.stack);
                }
            })();

        } catch (error) {
            console.error(`[${requestId}] ❌ Unhandled error:`, error);
            console.error(`[${requestId}] Stack trace:`, error.stack);
            if (!res.headersSent) {
                res.status(500).json({ 
                    success: false, 
                    message: 'Internal Server Error.' 
                });
            }
        }
    }

    static async updateGoogleSheets(session_id, iaDescription, description, images) {
        const logPrefix = `[Sheets:${session_id}]`;
        console.log(`${logPrefix} 🔄 Finding row for session_id: ${session_id}`);
        
        const values = await sheetsService.getValues(
            config.PENDING_APPRAISALS_SPREADSHEET_ID,
            `${config.GOOGLE_SHEET_NAME}!A:O`
        );

        let rowIndex = null;
        let customer_name = '';

        for (let i = 0; i < values.length; i++) {
            if (values[i][2] === session_id) {
                rowIndex = i + 1;
                customer_name = values[i][4] || '';
                console.log(`${logPrefix} ✅ Found matching row: ${rowIndex}, customer_name: ${customer_name}`);
                break;
            }
        }

        if (!rowIndex) {
            console.error(`${logPrefix} ❌ Session ID not found in spreadsheet`);
            throw new Error(`Session ID ${session_id} not found`);
        }

        // Update sheets in parallel
        console.log(`${logPrefix} 🔄 Updating spreadsheet row ${rowIndex}`);
        await Promise.all([
            sheetsService.updateValues(
                config.PENDING_APPRAISALS_SPREADSHEET_ID,
                `${config.GOOGLE_SHEET_NAME}!H${rowIndex}`,
                [[iaDescription]]
            ),
            sheetsService.updateValues(
                config.PENDING_APPRAISALS_SPREADSHEET_ID,
                `${config.GOOGLE_SHEET_NAME}!I${rowIndex}`,
                [[description || '']]
            ),
            sheetsService.updateValues(
                config.PENDING_APPRAISALS_SPREADSHEET_ID,
                `${config.GOOGLE_SHEET_NAME}!O${rowIndex}`,
                [[JSON.stringify(images)]]
            )
        ]);

        console.log(`${logPrefix} ✅ Spreadsheet updates completed for row ${rowIndex}`);
        return { customer_name };
    }
}

module.exports = {
    updatePendingAppraisal: UpdatePendingController.updatePendingAppraisal,
    updateGoogleSheets: UpdatePendingController.updateGoogleSheets
};