const nodemailer = require('nodemailer');

/**
 * Create a nodemailer SMTP transporter using env vars.
 * Uses Gmail with App Password by default.
 */
function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: false, // true for 465, false for 587 (STARTTLS)
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

/**
 * Send an email with optional attachments.
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email body (HTML)
 * @param {Array}  [options.attachments] - Nodemailer attachments array
 * @returns {Promise<Object>} - Nodemailer send result
 */
async function sendEmail({ to, subject, html, attachments = [] }) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️  SMTP credentials not configured. Skipping email send.');
        return null;
    }

    const transporter = createTransporter();

    const mailOptions = {
        from: `"Naukri Job Scraper" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        attachments,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Email sent to ${to}: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error(`❌ Failed to send email to ${to}:`, error.message);
        throw error;
    }
}

module.exports = { sendEmail };
