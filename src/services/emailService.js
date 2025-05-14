const sendGridMail = require('@sendgrid/mail');
const { getSecret } = require('./secretManager');

/**
 * Service for sending emails via SendGrid
 */
class EmailService {
  constructor() {
    this.isInitialized = false;
    this.fromEmail = null;
    this.templateIds = {
      appraisalCompleted: null,
      appraisalUpdate: null
    };
  }

  /**
   * Initialize SendGrid with API key from Secret Manager
   */
  async initialize() {
    if (this.isInitialized) return true;

    try {
      console.log('🔄 Initializing SendGrid service...');
      
      // Get API key from Secret Manager
      const apiKey = await getSecret('SENDGRID_API_KEY');
      
      if (!apiKey) {
        console.warn('❌ SENDGRID_API_KEY not found in Secret Manager');
        return false;
      }
      
      sendGridMail.setApiKey(apiKey);
      
      // Get email settings from environment or Secret Manager
      this.fromEmail = process.env.SENDGRID_EMAIL || await getSecret('SENDGRID_EMAIL') || 'noreply@appraisily.com';
      
      // Get template IDs
      this.templateIds.appraisalCompleted = process.env.SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED || 
                                          await getSecret('SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED');
      
      this.templateIds.appraisalUpdate = process.env.SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE || 
                                       await getSecret('SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE');
      
      this.isInitialized = true;
      console.log('✅ SendGrid initialized with API key');
      return true;
    } catch (error) {
      console.error('❌ SendGrid initialization failed:', error instanceof Error ? error.message : String(error));
      return false;
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
    if (!await this.initialize()) {
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
        from: this.fromEmail,
        templateId: this.templateIds.appraisalCompleted,
        dynamic_template_data: {
          customer_name: customerName || 'Valued Customer',
          appraisal_value: appraisalData?.value || 'N/A',
          description: appraisalData?.description || 'No description available',
          pdf_link: appraisalData?.pdfLink || '',
          wp_link: appraisalData?.wpLink || '',
          dashboard_link: `https://www.appraisily.com/dashboard/?email=${encodeURIComponent(customerEmail)}`,
          current_year: currentYear,
        },
      };

      // Log template data for debugging
      console.log('Email template data:', {
        customer_name: customerName || 'Valued Customer',
        pdf_link: appraisalData?.pdfLink || '',
        wp_link: appraisalData?.wpLink || '',
      });

      await sendGridMail.send(emailContent);
      console.log(`✅ Appraisal completed email sent to ${customerEmail}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending appraisal completed email:', error instanceof Error ? error.message : String(error));
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
    if (!await this.initialize()) {
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
        from: this.fromEmail,
        templateId: this.templateIds.appraisalUpdate,
        dynamic_template_data: {
          customer_name: customerName || 'Valued Customer',
          description: description || '',
          initial_description: iaDescription || '',
          customer_email: customerEmail,
          current_year: currentYear,
          dashboard_link: `https://www.appraisily.com/dashboard/?email=${encodeURIComponent(customerEmail)}`,
        },
        sendAt: sendAtTimestamp,
      };

      await sendGridMail.send(emailContent);
      console.log(`✅ Appraisal update email scheduled for ${customerEmail}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending appraisal update email:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }
}

module.exports = new EmailService();