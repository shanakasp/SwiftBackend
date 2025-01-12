// services/emailService.js
const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER || "shanakaprince@gmail.com",
        pass: process.env.EMAIL_PASSWORD || "xqlw xhyl vvem zhlk",
      },
    });
  }

  getJobApplicationTemplate() {
    return `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h1 style="color: #38a169;">Thank You for Applying!</h1>
        <p>Dear Applicant,</p>
        <p>We have received your application for the position at Swift.</p>
        <p>We will review your application and get back to you soon.</p>
        <p>Best regards,</p>
        <p><strong>Swift HR Team</strong></p>
        <div style="text-align: center; color: #38a169;">
          <p>South Africa's most innovative e-hailing service.</p>
        </div>
        <div style="text-align: center;">
        </div>
        <div style="text-align: center; color: #d69e2e; margin-top: 20px;">
          <p>© ${new Date().getFullYear()} Swift! All rights reserved.</p>
        </div>
      </div>
    `;
  }

  async sendJobApplicationEmail(email) {
    const mailOptions = {
      from: "Swift Admin Team",
      to: email,
      subject: "Swift: Job Application Received",
      html: this.getJobApplicationTemplate(),
    };

    try {
      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error("Email error:", error);
      throw error;
    }
  }
}

module.exports = new EmailService();
