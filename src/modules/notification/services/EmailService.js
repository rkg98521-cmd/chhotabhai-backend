/**
 * @file EmailService.js
 * @description Enterprise-grade, environment-aware Email Service wrapper built on nodemailer.
 * Supports Generic SMTP, Gmail App Passwords, SendGrid, and AWS SES.
 * Provides fallback mock logging in local development if credentials are absent.
 */

import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.defaultFrom = process.env.EMAIL_FROM || '"ChhotaBhai Accessories" <no-reply@chhotabhai.com>';
    this.initializeTransporter();
  }

  /**
   * Initializes the nodemailer transport based on current environment configuration.
   */
  initializeTransporter() {
    const {
      EMAIL_SERVICE,
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      GMAIL_USER,
      GMAIL_APP_PASSWORD,
      SENDGRID_API_KEY,
    } = process.env;

    // 1. Explicit SendGrid SMTP
    if (EMAIL_SERVICE === 'sendgrid' || SENDGRID_API_KEY) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: SENDGRID_API_KEY || SMTP_PASS,
        },
      });
      this.isConfigured = true;
      console.log('✉️  [EmailService] Initialized with SendGrid SMTP.');
      return;
    }

    // 2. Explicit AWS SES SMTP
    if (EMAIL_SERVICE === 'ses' && SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 465,
        secure: Number(SMTP_PORT) === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });
      this.isConfigured = true;
      console.log('✉️  [EmailService] Initialized with AWS SES SMTP.');
      return;
    }

    // 3. Gmail App Password (Convenient for Dev & Staging)
    if (GMAIL_USER && GMAIL_APP_PASSWORD) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: GMAIL_USER,
          pass: GMAIL_APP_PASSWORD,
        },
      });
      this.isConfigured = true;
      console.log(`✉️  [EmailService] Initialized with Gmail SMTP (${GMAIL_USER}).`);
      return;
    }

    // 4. Generic Custom SMTP (Host / Port / Auth)
    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      const port = Number(SMTP_PORT) || 587;
      this.transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port,
        secure: port === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });
      this.isConfigured = true;
      console.log(`✉️  [EmailService] Initialized with custom SMTP (${SMTP_HOST}:${port}).`);
      return;
    }

    // 5. Development Fallback (Console Mock)
    this.isConfigured = false;
    console.warn(
      '⚠️  [EmailService] No SMTP credentials provided. Running in MOCK mode. Emails will be logged to console.'
    );
  }

  /**
   * Verifies the SMTP transporter connectivity.
   * Useful during server boot health checks.
   * @returns {Promise<boolean>}
   */
  async verifyConnection() {
    if (!this.isConfigured || !this.transporter) {
      return false;
    }
    try {
      await this.transporter.verify();
      console.log('✅ [EmailService] SMTP connection verified successfully.');
      return true;
    } catch (error) {
      console.error('❌ [EmailService] SMTP verification failed:', error.message);
      return false;
    }
  }

  /**
   * Sends an email with HTML and fallback text content.
   *
   * @param {Object} options
   * @param {string} options.to - Recipient email address
   * @param {string} options.subject - Email subject line
   * @param {string} options.html - Rendered HTML content
   * @param {string} [options.text] - Plain text fallback
   * @param {string} [options.from] - Custom sender (defaults to EMAIL_FROM)
   * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
   */
  async sendEmail({ to, subject, html, text, from }) {
    if (!to) {
      console.error('❌ [EmailService] sendEmail aborted: Recipient "to" is required.');
      return { success: false, error: 'Recipient email is missing.' };
    }

    const mailOptions = {
      from: from || this.defaultFrom,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>?/gm, '').substring(0, 300), // Auto strip basic html if text is absent
    };

    // If running in development without credentials, log cleanly without throwing
    if (!this.isConfigured || !this.transporter) {
      console.log('\n================== [DEV EMAIL DISPATCH MOCK] ==================');
      console.log(`To:      ${mailOptions.to}`);
      console.log(`From:    ${mailOptions.from}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log(`Timestamp: ${new Date().toISOString()}`);
      console.log('Payload Preview (First 200 chars):');
      console.log(mailOptions.text.slice(0, 200) + '...');
      console.log('===============================================================\n');
      return { success: true, messageId: `mock-${Date.now()}` };
    }

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`📨 [EmailService] Sent "${subject}" to ${to} (MessageId: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`❌ [EmailService] Delivery failed to ${to} for "${subject}":`, error.message);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;
