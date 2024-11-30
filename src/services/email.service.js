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

            if (!config.SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE) {
                throw new Error('SendGrid update template ID not configured');
            }

            sendGridMail.setApiKey(config.SENDGRID_API_KEY);
            this.isAvailable = true;
            console.log('SendGrid service initialized successfully');
            return true;
        } catch (error) {
            console.error('SendGrid service initialization failed:', error);
            this.isAvailable = false;
            throw error;
        }
    }

    async sendAppraisalUpdateEmail(customerEmail, customerName, description, iaDescription) {
        try {
            if (!this.isAvailable) {
                await this.initialize();
            }

            if (!customerEmail) {
                throw new Error('Customer email is required');
            }

            const currentYear = new Date().getFullYear();
            const delayInMinutes = 12; // Increased delay to 12 minutes
            const sendAtTimestamp = Math.floor((Date.now() + (delayInMinutes * 60 * 1000)) / 1000);
            const dashboardUrl = `https://resources.appraisily.com/dashboard/?email=${encodeURIComponent(customerEmail)}`;

            const emailContent = {
                to: customerEmail,
                from: {
                    email: config.SENDGRID_EMAIL,
                    name: 'Appraisily'
                },
                templateId: config.SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_UPDATE,
                dynamic_template_data: {
                    customer_name: customerName || 'Valued Customer',
                    description: description || '',
                    preliminary_description: iaDescription,
                    customer_email: customerEmail,
                    dashboard_link: dashboardUrl,
                    current_year: currentYear,
                },
                sendAt: sendAtTimestamp,
            };

            console.log('Scheduling email with content:', JSON.stringify(emailContent, null, 2));
            console.log(`Email will be sent in ${delayInMinutes} minutes at:`, new Date(sendAtTimestamp * 1000).toISOString());
            
            const response = await sendGridMail.send(emailContent);
            console.log('Email scheduled successfully. Response:', response);

            return true;
        } catch (error) {
            console.error('Error sending appraisal update email:', error);
            if (error.response) {
                console.error('SendGrid API error response:', error.response.body);
            }
            throw error;
        }
    }

    async sendAppraisalCompletedEmail(customerEmail, customerName, appraisalData) {
        try {
            if (!this.isAvailable) {
                await this.initialize();
            }

            const currentYear = new Date().getFullYear();
            const dashboardUrl = `https://resources.appraisily.com/dashboard/?email=${encodeURIComponent(customerEmail)}`;

            const emailContent = {
                to: customerEmail,
                from: {
                    email: config.SENDGRID_EMAIL,
                    name: 'Appraisily'
                },
                templateId: config.SEND_GRID_TEMPLATE_NOTIFY_APPRAISAL_COMPLETED,
                dynamic_template_data: {
                    customer_name: customerName || 'Valued Customer',
                    appraisal_value: appraisalData.value,
                    description: appraisalData.description,
                    pdf_link: appraisalData.pdfLink,
                    dashboard_link: dashboardUrl,
                    current_year: currentYear,
                },
            };

            console.log('Sending completion email with content:', JSON.stringify(emailContent, null, 2));
            const response = await sendGridMail.send(emailContent);
            console.log('Completion email sent successfully. Response:', response);

            return true;
        } catch (error) {
            console.error('Error sending appraisal completed email:', error);
            if (error.response) {
                console.error('SendGrid API error response:', error.response.body);
            }
            throw error;
        }
    }
}

module.exports = new EmailService();