const { sheetsService, wordpressService, pubsubService } = require('../../services');
const { config } = require('../../config');
const fetch = require('node-fetch');

class AppraisalValueController {
  static async setValue(req, res) {
    const { id } = req.params;
    const { appraisalValue, description, isEdit } = req.body;

    try {
      const sheetName = isEdit ? config.EDIT_SHEET_NAME : config.GOOGLE_SHEET_NAME;

      await sheetsService.updateValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${sheetName}!J${id}:K${id}`,
        [[appraisalValue, description]]
      );

      const values = await sheetsService.getValues(
        config.PENDING_APPRAISALS_SPREADSHEET_ID,
        `${sheetName}!G${id}`
      );

      const wordpressUrl = values[0][0];
      const postId = new URL(wordpressUrl).searchParams.get('post');

      await wordpressService.updatePost(postId, {
        acf: { value: appraisalValue }
      });

      res.json({ success: true, message: 'Appraisal value set successfully.' });
    } catch (error) {
      console.error('Error setting appraisal value:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async proposeValue(req, res) {
    try {
      const { appraiserDescription, customerDescription, aiDescription } = req.body;
      
      if (!appraiserDescription || !customerDescription || !aiDescription) {
        return res.status(400).json({
          success: false,
          message: 'All descriptions (appraiser, customer, and AI) are required'
        });
      }
      
      const messages = [
        {
          role: 'system',
          content: `You are an expert art appraiser assistant. Your task is to analyze descriptions and provide a structured output in JSON format that includes a concise, searchable description (maximum 8 words) that captures the key characteristics for finding similar items in a sales database.

The output should follow this exact format:
{
  "searchableDescription": "string (max 8 words)",
  "period": "string (e.g., Victorian, Modern, etc.)",
  "material": "string (primary material)",
  "type": "string (e.g., table, painting, etc.)",
  "condition": "string (e.g., excellent, good, fair)"
}`
        },
        {
          role: 'user',
          content: `Please analyze these three descriptions and provide a structured JSON output following the specified format:

Appraiser's Description:
${appraiserDescription}

Customer's Description:
${customerDescription}

AI Image Analysis:
${aiDescription}`
        }
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'o3-mini-high',
          messages
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      const data = await response.json();
      const parsedOutput = JSON.parse(data.choices[0].message.content.trim());
      
      // Validate the OpenAI response format
      if (!parsedOutput.searchableDescription) {
        throw new Error('Invalid response format from OpenAI');
      }

      // Call the valuer agent service
      const valuerResponse = await fetch('https://valuer-agent-856401495068.us-central1.run.app/api/find-value', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: parsedOutput.searchableDescription
        })
      });

      if (!valuerResponse.ok) {
        const error = await valuerResponse.text();
        throw new Error(`Valuer agent error: ${error}`);
      }

      const valuerData = await valuerResponse.json();

      res.json({
        success: true,
        value: valuerData.value
      });

    } catch (error) {
      console.error('Error proposing value:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error proposing value'
      });
    }
  }

  static async completeProcess(req, res) {
    const { id } = req.params;
    const { appraisalValue, description, appraisalType } = req.body;

    if (!appraisalValue || !description) {
      return res.status(400).json({ 
        success: false, 
        message: 'appraisalValue and description are required.' 
      });
    }

    try {
      // Send an immediate response that the request was received
      res.json({ 
        success: true, 
        message: 'Appraisal process started successfully. Processing will continue in the background.' 
      });

      // Make the request to the task queue service asynchronously after sending response
      // We don't await this, it will run in the background
      fetch(`${config.TASK_QUEUE_URL}/api/process-step`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id,
          startStep: 'STEP_SET_VALUE',
          options: {
            appraisalValue,
            description,
            ...(appraisalType && { appraisalType })
          }
        })
      }).then(taskQueueResponse => {
        if (!taskQueueResponse.ok) {
          return taskQueueResponse.json().then(errorData => {
            console.error(`Task queue service error: ${errorData.message || taskQueueResponse.statusText}`);
          });
        }
        console.log(`Background task for appraisal ${id} initiated successfully`);
      }).catch(error => {
        console.error('Error in background task processing:', error);
      });
      
    } catch (error) {
      console.error('Error starting appraisal process:', error);
      // Only reach here if there's an error before sending the response
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = AppraisalValueController;