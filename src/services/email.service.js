const sendGridMail = require('@sendgrid/mail');
const { config } = require('../config');

class EmailService {
  constructor() {
    this.isAvailable = false;
  }

  async initialize() {
    try {
      if (!config.SENDGRID_API_KEY) {
        throw new Error('SendGrid API key not configured');
      }

      sendGridMail.setApiKey(config.SENDGRID_API_KEY);
      this.isAvailable = true;
      return true;
    } catch (error) {
      this.isAvailable = false;
      throw error;
    }
  }

  async sendAppraisalCompletedEmail(customerEmail, customerName, appraisalData) {
    if (!this.isAvailable) {
      throw new Error('Email service is not available');
    }

    try {
      const currentYear = new Date().getFullYear();

      const emailContent = {
        to: customerEmail,
        from: config.SENDGRID_EMAIL,
        templateId: config.SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED,
        dynamic_template_data: {
          customer_name: customerName,
          appraisal_value: appraisalData.value,
          description: appraisalData.description,
          pdf_link: appraisalData.pdfLink,
          dashboard_link: `https://www.appraisily.com/dashboard/?email=${encodeURIComponent(customerEmail)}`,
          current_year: currentYear,
        },
      };

      await sendGridMail.send(emailContent);
      console.log(`Appraisal completed email sent to ${customerEmail}`);
    } catch (error) {
      console.error('Error sending appraisal completed email:', error);
      throw error;
    }
  }

  async sendAppraisalUpdateEmail(customerEmail, customerName, description, iaDescription) {
    if (!this.isAvailable) {
      throw new Error('Email service is not available');
    }

    try {
      const currentYear = new Date().getFullYear();
      const delayInMinutes = 1;
      const sendAtTimestamp = Math.floor((Date.now() + (delayInMinutes * 60 * 1000)) / 1000);

      const emailContent = {
        to: customerEmail,
        from: config.SENDGRID_EMAIL,
        templateId: config.SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE,
        dynamic_template_data: {
          customer_name: customerName,
          description: description || '',
          preliminary_description: iaDescription,
          customer_email: customerEmail,
          current_year: currentYear,
        },
        sendAt: sendAtTimestamp,
      };

      await sendGridMail.send(emailContent);
      console.log(`Appraisal update email scheduled for ${customerEmail}`);
    } catch (error) {
      console.error('Error sending appraisal update email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();