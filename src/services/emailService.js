const sendGridMail = require('@sendgrid/mail');

class EmailService {
  constructor() {
    // Initialize SendGrid only if API key is available
    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey) {
      sendGridMail.setApiKey(apiKey);
    }
  }

  async sendAppraisalCompletedEmail(customerEmail, customerName, appraisalData) {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SendGrid API key not configured, skipping email send');
      return;
    }

    try {
      const currentYear = new Date().getFullYear();

      const emailContent = {
        to: customerEmail,
        from: process.env.SENDGRID_EMAIL,
        templateId: process.env.SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED,
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
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SendGrid API key not configured, skipping email send');
      return;
    }

    try {
      const currentYear = new Date().getFullYear();
      const delayInMinutes = 1;
      const sendAtTimestamp = Math.floor((Date.now() + (delayInMinutes * 60 * 1000)) / 1000);

      const emailContent = {
        to: customerEmail,
        from: process.env.SENDGRID_EMAIL,
        templateId: process.env.SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE,
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