const sendGridMail = require('@sendgrid/mail');

/**
 * Service for sending emails via SendGrid
 */
class EmailService {
  constructor() {
    // Initialize SendGrid only if API key is available
    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey) {
      sendGridMail.setApiKey(apiKey);
      console.log('SendGrid initialized with API key');
    } else {
      console.warn('No SendGrid API key found in environment variables');
    }
  }

  /**
   * Send an email when an appraisal is completed
   * @param {string} customerEmail - Customer's email address
   * @param {string} customerName - Customer's name
   * @param {object} appraisalData - Appraisal data including value, description, and pdfLink
   * @returns {Promise<boolean>} Success status
   */
  async sendAppraisalCompletedEmail(customerEmail, customerName, appraisalData) {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SendGrid API key not configured, skipping email send');
      return false;
    }

    try {
      if (!customerEmail) {
        throw new Error('Customer email is required');
      }

      const currentYear = new Date().getFullYear();

      const emailContent = {
        to: customerEmail,
        from: process.env.SENDGRID_EMAIL || 'noreply@appraisily.com',
        templateId: process.env.SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED,
        dynamic_template_data: {
          customer_name: customerName || 'Valued Customer',
          appraisal_value: appraisalData?.value || 'N/A',
          description: appraisalData?.description || 'No description available',
          pdf_link: appraisalData?.pdfLink || '',
          dashboard_link: `https://www.appraisily.com/dashboard/?email=${encodeURIComponent(customerEmail)}`,
          current_year: currentYear,
        },
      };

      await sendGridMail.send(emailContent);
      console.log(`Appraisal completed email sent to ${customerEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending appraisal completed email:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Send an email update about an appraisal in progress
   * @param {string} customerEmail - Customer's email address
   * @param {string} customerName - Customer's name
   * @param {string} description - Appraisal description
   * @param {string} iaDescription - Initial AI-generated description
   * @returns {Promise<boolean>} Success status
   */
  async sendAppraisalUpdateEmail(customerEmail, customerName, description, iaDescription) {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SendGrid API key not configured, skipping email send');
      return false;
    }

    try {
      if (!customerEmail) {
        throw new Error('Customer email is required');
      }

      const currentYear = new Date().getFullYear();
      const delayInMinutes = 1;
      const sendAtTimestamp = Math.floor((Date.now() + (delayInMinutes * 60 * 1000)) / 1000);

      const emailContent = {
        to: customerEmail,
        from: process.env.SENDGRID_EMAIL || 'noreply@appraisily.com',
        templateId: process.env.SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE,
        dynamic_template_data: {
          customer_name: customerName || 'Valued Customer',
          description: description || '',
          preliminary_description: iaDescription || '',
          customer_email: customerEmail,
          current_year: currentYear,
          dashboard_link: `https://www.appraisily.com/dashboard/?email=${encodeURIComponent(customerEmail)}`,
        },
        sendAt: sendAtTimestamp,
      };

      await sendGridMail.send(emailContent);
      console.log(`Appraisal update email scheduled for ${customerEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending appraisal update email:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }
}

module.exports = new EmailService();