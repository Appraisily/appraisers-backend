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

      if (!config.SENDGRID_EMAIL) {
        throw new Error('SendGrid sender email not configured');
      }

      if (!config.SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED) {
        throw new Error('SendGrid template ID not configured');
      }

      sendGridMail.setApiKey(config.SENDGRID_API_KEY);
      this.isAvailable = true;
      console.log('✓ SendGrid service initialized');
      return true;
    } catch (error) {
      console.error('❌ SendGrid service initialization failed:', error);
      this.isAvailable = false;
      throw error;
    }
  }

  convertEditUrlToPublic(editUrl) {
    try {
      const url = new URL(editUrl);
      const postId = url.searchParams.get('post');
      if (!postId) {
        throw new Error('Could not extract post ID from edit URL');
      }
      return `https://resources.appraisily.com/appraisals/${postId}`;
    } catch (error) {
      console.error('❌ Error converting edit URL to public URL:', error);
      return '';
    }
  }

  async sendAppraisalCompletedEmail(customerEmail, customerName, appraisalData) {
    try {
      if (!this.isAvailable) {
        await this.initialize();
      }

      const currentYear = new Date().getFullYear();
      const publicUrl = this.convertEditUrlToPublic(appraisalData.wordpressUrl);
      const dashboardUrl = `https://resources.appraisily.com/dashboard/?email=${encodeURIComponent(customerEmail)}`;

      const emailContent = {
        to: customerEmail,
        from: config.SENDGRID_EMAIL,
        templateId: config.SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED,
        dynamic_template_data: {
          customer_name: customerName,
          appraisal_value: appraisalData.value,
          description: appraisalData.description,
          pdf_link: appraisalData.pdfLink,
          appraisal_link: publicUrl,
          dashboard_link: dashboardUrl,
          current_year: currentYear,
        },
      };

      await sendGridMail.send(emailContent);
      console.log(`✓ Appraisal completed email sent to ${customerEmail}`);
      console.log('Template data:', {
        publicUrl,
        pdfLink: appraisalData.pdfLink,
        dashboardUrl
      });
    } catch (error) {
      console.error('❌ Error sending appraisal completed email:', error);
      throw error;
    }
  }

  async sendAppraisalUpdateEmail(customerEmail, customerName, description, iaDescription) {
    try {
      if (!this.isAvailable) {
        await this.initialize();
      }

      const currentYear = new Date().getFullYear();
      const delayInMinutes = 1;
      const sendAtTimestamp = Math.floor((Date.now() + (delayInMinutes * 60 * 1000)) / 1000);
      const dashboardUrl = `https://resources.appraisily.com/dashboard/?email=${encodeURIComponent(customerEmail)}`;

      const emailContent = {
        to: customerEmail,
        from: config.SENDGRID_EMAIL,
        templateId: config.SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE,
        dynamic_template_data: {
          customer_name: customerName,
          description: description || '',
          preliminary_description: iaDescription,
          customer_email: customerEmail,
          dashboard_link: dashboardUrl,
          current_year: currentYear,
        },
        sendAt: sendAtTimestamp,
      };

      await sendGridMail.send(emailContent);
      console.log(`✓ Appraisal update email scheduled for ${customerEmail}`);
      console.log('Template data:', {
        dashboardUrl
      });
    } catch (error) {
      console.error('❌ Error sending appraisal update email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();