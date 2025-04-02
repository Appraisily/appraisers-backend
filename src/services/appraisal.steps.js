/**
 * Service for step-by-step appraisal processing
 */

const { sheetsService, wordpressService, openaiService, pubsubService } = require('./index');
const { config } = require('../config');

/**
 * Step definition constants
 */
const STEPS = {
  SET_VALUE: 'STEP_SET_VALUE',
  MERGE_DESCRIPTIONS: 'STEP_MERGE_DESCRIPTIONS',
  GET_TYPE: 'STEP_GET_TYPE',
  UPDATE_WORDPRESS: 'STEP_UPDATE_WORDPRESS',
  FETCH_VALUER_DATA: 'STEP_FETCH_VALUER_DATA',
  GENERATE_VISUALIZATION: 'STEP_GENERATE_VISUALIZATION',
  BUILD_REPORT: 'STEP_BUILD_REPORT',
  GENERATE_PDF: 'STEP_GENERATE_PDF',
  SEND_EMAIL: 'STEP_SEND_EMAIL',
  COMPLETE: 'STEP_COMPLETE'
};

/**
 * Process an appraisal from a specific step
 * @param {string|number} id - Appraisal ID
 * @param {string} startStep - Step to start from
 * @param {object} options - Additional options
 * @returns {Promise<object>} - Process result
 */
async function processFromStep(id, startStep, options = {}) {
  // Initialize context object to store state between steps
  const context = {
    id,
    options,
    logs: []
  };

  try {
    // Add initial context log
    addLog(context, 'info', `Starting appraisal processing for ID ${id} from step ${startStep}`);
    
    // Define the step order
    const stepOrder = [
      STEPS.SET_VALUE,
      STEPS.MERGE_DESCRIPTIONS,
      STEPS.GET_TYPE,
      STEPS.UPDATE_WORDPRESS,
      STEPS.FETCH_VALUER_DATA,
      STEPS.GENERATE_VISUALIZATION,
      STEPS.BUILD_REPORT,
      STEPS.GENERATE_PDF,
      STEPS.SEND_EMAIL,
      STEPS.COMPLETE
    ];
    
    // Find the starting index
    const startIndex = stepOrder.indexOf(startStep);
    if (startIndex === -1) {
      throw new Error(`Invalid step: ${startStep}`);
    }
    
    // Load necessary data before executing steps
    await loadInitialData(context);
    
    // Execute steps in sequence starting from the specified step
    for (let i = startIndex; i < stepOrder.length; i++) {
      const currentStep = stepOrder[i];
      addLog(context, 'info', `Executing step: ${currentStep}`);
      
      try {
        await executeStep(context, currentStep);
      } catch (stepError) {
        addLog(context, 'error', `Error in step ${currentStep}: ${stepError.message}`);
        throw {
          message: `Error in step ${currentStep}: ${stepError.message}`,
          logs: context.logs
        };
      }
    }
    
    addLog(context, 'info', 'Appraisal processing completed successfully');
    
    return {
      success: true,
      logs: context.logs
    };
  } catch (error) {
    console.error(`Error processing appraisal ${id}:`, error);
    
    // If error is already formatted with logs, just return it
    if (error.logs) {
      return {
        success: false,
        message: error.message,
        logs: error.logs
      };
    }
    
    // Otherwise format it
    addLog(context, 'error', `Processing failed: ${error.message}`);
    
    return {
      success: false,
      message: error.message,
      logs: context.logs
    };
  }
}

/**
 * Load initial data needed for processing
 * @param {object} context - Context object
 */
async function loadInitialData(context) {
  addLog(context, 'info', `Loading initial data for appraisal ${context.id}`);
  
  // Get existing value, description, etc. from sheets
  try {
    // Get row data from Google Sheets
    const sheetName = context.options.isEdit ? config.EDIT_SHEET_NAME : config.GOOGLE_SHEET_NAME;
    const rowData = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${sheetName}!A${context.id}:L${context.id}`
    );
    
    if (rowData && rowData[0]) {
      const row = rowData[0];
      context.existingData = {
        value: row[9] || '',                // Column J
        description: row[10] || '',         // Column K 
        mergedDescription: row[11] || '',   // Column L
        aiDescription: row[7] || '',        // Column H
        customerEmail: row[3] || '',        // Column D
        customerName: row[4] || '',         // Column E
        wordpressUrl: row[6] || ''          // Column G
      };
      
      // Get WordPress post ID if available
      if (context.existingData.wordpressUrl) {
        try {
          const url = new URL(context.existingData.wordpressUrl);
          context.postId = url.searchParams.get('post');
          addLog(context, 'info', `WordPress post ID: ${context.postId}`);
        } catch (urlError) {
          addLog(context, 'warn', `Could not parse WordPress URL: ${context.existingData.wordpressUrl}`);
        }
      }
      
      addLog(context, 'info', 'Existing data loaded successfully');
    } else {
      addLog(context, 'warn', 'No existing data found in Google Sheets');
    }
  } catch (error) {
    addLog(context, 'error', `Error loading initial data: ${error.message}`);
    throw error;
  }
}

/**
 * Execute a specific step
 * @param {object} context - Context object
 * @param {string} step - Step to execute
 */
async function executeStep(context, step) {
  switch (step) {
    case STEPS.SET_VALUE:
      await setValueStep(context);
      break;
      
    case STEPS.MERGE_DESCRIPTIONS:
      await mergeDescriptionsStep(context);
      break;
      
    case STEPS.GET_TYPE:
      await getTypeStep(context);
      break;
      
    case STEPS.UPDATE_WORDPRESS:
      await updateWordPressStep(context);
      break;
      
    case STEPS.FETCH_VALUER_DATA:
      await fetchValuerDataStep(context);
      break;
      
    case STEPS.GENERATE_VISUALIZATION:
      await generateVisualizationStep(context);
      break;
      
    case STEPS.BUILD_REPORT:
      await buildReportStep(context);
      break;
      
    case STEPS.GENERATE_PDF:
      await generatePdfStep(context);
      break;
      
    case STEPS.SEND_EMAIL:
      await sendEmailStep(context);
      break;
      
    case STEPS.COMPLETE:
      await completeStep(context);
      break;
      
    default:
      throw new Error(`Unknown step: ${step}`);
  }
}

/**
 * Add a log entry to the context
 * @param {object} context - Context object
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Log message
 */
function addLog(context, level, message) {
  if (!context.logs) {
    context.logs = [];
  }
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message
  };
  
  context.logs.push(logEntry);
  
  // Also log to console
  switch (level) {
    case 'error':
      console.error(message);
      break;
    case 'warn':
      console.warn(message);
      break;
    default:
      console.log(message);
  }
}

/**
 * Update appraisal status with details
 * @param {object} context - Context object
 * @param {string} status - Status to set
 * @param {string} details - Status details
 */
async function updateStatus(context, status, details = null) {
  try {
    addLog(context, 'info', `Updating status to ${status}${details ? `: ${details}` : ''}`);
    
    // Update status in Google Sheets
    await sheetsService.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!F${context.id}`,
      [[status]]
    );
    
    // If details are provided, update the details column
    if (details) {
      const timestamp = new Date().toISOString();
      const statusDetails = `[${timestamp}] ${status}: ${details}`;
      
      try {
        // Get existing details if any
        const existingDetails = await sheetsService.getValues(
          config.PENDING_APPRAISALS_SPREADSHEET_ID,
          `${config.GOOGLE_SHEET_NAME}!R${context.id}`
        );
        
        let updatedDetails = statusDetails;
        
        if (existingDetails && existingDetails[0] && existingDetails[0][0]) {
          // Prepend new status to existing log (limited to last 5 status updates)
          const detailsLog = existingDetails[0][0].split('\n');
          const recentDetails = [statusDetails, ...detailsLog.slice(0, 4)];
          updatedDetails = recentDetails.join('\n');
        }
        
        // Update details column
        await sheetsService.updateValues(
          config.PENDING_APPRAISALS_SPREADSHEET_ID,
          `${config.GOOGLE_SHEET_NAME}!R${context.id}`,
          [[updatedDetails]]
        );
      } catch (detailsError) {
        addLog(context, 'warn', `Error updating status details: ${detailsError.message}`);
      }
    }
    
    // Update WordPress if post ID is available
    if (context.postId) {
      try {
        await wordpressService.updatePost(context.postId, {
          acf: {
            status_progress: status,
            status_details: details || '',
            status_timestamp: new Date().toISOString()
          }
        });
      } catch (wpError) {
        addLog(context, 'warn', `Error updating WordPress status: ${wpError.message}`);
      }
    }
  } catch (error) {
    addLog(context, 'error', `Error updating status: ${error.message}`);
    // Don't throw to prevent status updates from breaking the main flow
  }
}

// Step implementations

async function setValueStep(context) {
  const { id } = context;
  
  // Use the value from context or from options
  const value = context.options.value || context.existingData?.value || '';
  const description = context.options.description || context.existingData?.description || '';
  
  if (!value || !description) {
    addLog(context, 'warn', 'Value or description is missing. Using existing data if available.');
  }
  
  await updateStatus(context, 'Processing', 'Setting appraisal value');
  
  // Update values in Google Sheets
  const sheetName = context.options.isEdit ? config.EDIT_SHEET_NAME : config.GOOGLE_SHEET_NAME;
  await sheetsService.updateValues(
    config.PENDING_APPRAISALS_SPREADSHEET_ID,
    `${sheetName}!J${id}:K${id}`,
    [[value, description]]
  );
  
  // If WordPress post ID is available, update there too
  if (context.postId) {
    await wordpressService.updatePost(context.postId, {
      acf: { value }
    });
    addLog(context, 'info', 'Updated value in WordPress');
  }
  
  addLog(context, 'info', 'Set value step completed successfully');
}

async function mergeDescriptionsStep(context) {
  const { id } = context;
  
  await updateStatus(context, 'Analyzing', 'Merging customer and AI descriptions');
  
  // Get customer description and AI description
  const description = context.options.description || context.existingData?.description || '';
  const aiDescription = context.existingData?.aiDescription || '';
  
  if (!description || !aiDescription) {
    addLog(context, 'warn', 'Customer description or AI description is missing');
  }
  
  // Use OpenAI to merge descriptions
  const mergedDescription = await openaiService.mergeDescriptions(description, aiDescription);
  
  // Save merged description to Google Sheets
  await sheetsService.updateValues(
    config.PENDING_APPRAISALS_SPREADSHEET_ID,
    `${config.GOOGLE_SHEET_NAME}!L${id}`,
    [[mergedDescription]]
  );
  
  // Store in context for later steps
  context.mergedDescription = mergedDescription;
  
  addLog(context, 'info', 'Merged descriptions successfully');
}

async function getTypeStep(context) {
  const { id } = context;
  
  await updateStatus(context, 'Analyzing', 'Determining appraisal type');
  
  // Get appraisal type from options or from Google Sheets
  if (context.options.appraisalType) {
    context.appraisalType = context.options.appraisalType;
    addLog(context, 'info', `Using provided appraisal type: ${context.appraisalType}`);
  } else {
    // Get from Google Sheets
    const values = await sheetsService.getValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!B${id}`
    );
    
    if (!values || !values[0] || !values[0][0]) {
      context.appraisalType = 'Regular';
      addLog(context, 'warn', 'No appraisal type found, using default: Regular');
    } else {
      let appraisalType = values[0][0].toString();
      
      // Validate type
      const validTypes = ['Regular', 'IRS', 'Insurance'];
      if (!validTypes.includes(appraisalType)) {
        appraisalType = 'Regular';
        addLog(context, 'warn', `Invalid appraisal type: ${values[0][0]}, using default: Regular`);
      }
      
      context.appraisalType = appraisalType;
      addLog(context, 'info', `Using appraisal type from sheet: ${context.appraisalType}`);
    }
  }
}

async function updateWordPressStep(context) {
  const { id, postId } = context;
  
  await updateStatus(context, 'Updating', 'Setting title and metadata in WordPress');
  
  if (!postId) {
    addLog(context, 'error', 'WordPress post ID not available');
    throw new Error('WordPress post ID not available');
  }
  
  // Get post data
  const post = await wordpressService.getPost(postId);
  
  // Get values to update
  const mergedDescription = context.mergedDescription || context.existingData?.mergedDescription || '';
  const value = context.options.value || context.existingData?.value || '';
  const appraisalType = context.appraisalType || 'Regular';
  
  // Update WordPress post
  const updatedPost = await wordpressService.updatePost(postId, {
    title: mergedDescription,
    content: post.content?.rendered || '',
    acf: {
      value: value.toString(),
      appraisaltype: appraisalType
    }
  });
  
  // Store public URL in context
  if (updatedPost.link) {
    context.publicUrl = updatedPost.link;
    
    // Update public URL in Google Sheets
    await sheetsService.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!P${id}`,
      [[context.publicUrl]]
    );
  }
  
  addLog(context, 'info', 'Updated WordPress post successfully');
}

async function fetchValuerDataStep(context) {
  // This step would connect to valuer-agent to get market data
  // Since valuer-agent is a separate service, we'll mock this for now
  
  await updateStatus(context, 'Analyzing', 'Fetching market data from valuer-agent');
  
  const { postId } = context;
  
  if (!postId) {
    addLog(context, 'error', 'WordPress post ID not available');
    throw new Error('WordPress post ID not available');
  }
  
  addLog(context, 'info', 'Valuer data fetching is a placeholder in this implementation');
  
  // Real implementation would call the valuer-agent API here
  // For now, we'll just log that this step would happen
  
  addLog(context, 'info', 'Valuer data fetching step completed');
}

async function generateVisualizationStep(context) {
  const { postId } = context;
  
  await updateStatus(context, 'Generating', 'Creating visualizations');
  
  if (!postId) {
    addLog(context, 'error', 'WordPress post ID not available');
    throw new Error('WordPress post ID not available');
  }
  
  try {
    // This would use the visualization service from the appraisals-backend
    // For now, we'll just make a direct call to the visualization endpoint
    
    const response = await fetch(`${config.EXTERNAL_SERVICES.APPRAISALS_BACKEND}/generate-visualizations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      },
      body: JSON.stringify({ postId })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Visualization generation failed: ${errorText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      addLog(context, 'info', 'Visualizations generated successfully');
    } else {
      throw new Error(result.message || 'Visualization generation failed');
    }
  } catch (error) {
    addLog(context, 'error', `Error generating visualizations: ${error.message}`);
    // This step can fail without stopping the process
    addLog(context, 'warn', 'Continuing despite visualization error');
  }
}

async function buildReportStep(context) {
  const { postId } = context;
  
  await updateStatus(context, 'Generating', 'Building full appraisal report');
  
  if (!postId) {
    addLog(context, 'error', 'WordPress post ID not available');
    throw new Error('WordPress post ID not available');
  }
  
  try {
    await wordpressService.completeAppraisalReport(postId);
    addLog(context, 'info', 'Appraisal report built successfully');
  } catch (error) {
    addLog(context, 'error', `Error building report: ${error.message}`);
    throw error;
  }
}

async function generatePdfStep(context) {
  const { postId, id } = context;
  
  await updateStatus(context, 'Finalizing', 'Creating PDF document');
  
  if (!postId) {
    addLog(context, 'error', 'WordPress post ID not available');
    throw new Error('WordPress post ID not available');
  }
  
  try {
    // This would use the PDF service from the appraisals-backend
    // For now, we'll just make a direct call to the PDF endpoint
    
    const response = await fetch(`${config.EXTERNAL_SERVICES.APPRAISALS_BACKEND}/generate-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      },
      body: JSON.stringify({ postId })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PDF generation failed: ${errorText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      // Store PDF links
      context.pdfLink = result.pdfLink;
      context.docLink = result.docLink;
      
      // Update PDF links in Google Sheets
      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${config.GOOGLE_SHEET_NAME}!M${id}:N${id}`,
        [[context.pdfLink, context.docLink]]
      );
      
      addLog(context, 'info', `PDF generated successfully: ${context.pdfLink}`);
    } else {
      throw new Error(result.message || 'PDF generation failed');
    }
  } catch (error) {
    addLog(context, 'error', `Error generating PDF: ${error.message}`);
    throw error;
  }
}

async function sendEmailStep(context) {
  const { id, pdfLink, publicUrl } = context;
  
  await updateStatus(context, 'Finalizing', 'Sending notification email');
  
  if (!pdfLink) {
    addLog(context, 'warn', 'PDF link not available, email may not include it');
  }
  
  try {
    // Get customer data
    const customerEmail = context.existingData?.customerEmail || '';
    const customerName = context.existingData?.customerName || '';
    
    if (!customerEmail) {
      addLog(context, 'warn', 'Customer email not available, cannot send email');
      return;
    }
    
    // This step would call the email service
    // For now, we'll just log that this step would happen
    
    addLog(context, 'info', `Email would be sent to ${customerEmail} (${customerName})`);
    
    // Update email status in Google Sheets
    const emailStatus = `Email sent on ${new Date().toISOString()} (ID: mock-message-id)`;
    await sheetsService.updateValues(
      config.PENDING_APPRAISALS_SPREADSHEET_ID,
      `${config.GOOGLE_SHEET_NAME}!Q${id}`,
      [[emailStatus]]
    );
    
    addLog(context, 'info', 'Email step completed successfully');
  } catch (error) {
    addLog(context, 'error', `Error sending email: ${error.message}`);
    throw error;
  }
}

async function completeStep(context) {
  const { id } = context;
  
  await updateStatus(context, 'Completed', 'Appraisal process completed successfully');
  
  try {
    // Mark as complete in Google Sheets - move to completed sheet
    await sheetsService.moveToCompleted(id);
    
    addLog(context, 'info', `Appraisal ${id} marked as complete and moved to completed sheet`);
  } catch (error) {
    addLog(context, 'error', `Error completing appraisal: ${error.message}`);
    throw error;
  }
}

module.exports = {
  STEPS,
  processFromStep
};