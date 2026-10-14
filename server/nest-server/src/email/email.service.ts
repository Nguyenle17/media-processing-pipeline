import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  async sendVerificationEmail(to: string, token: string) {
    const verifyUrl =
      `${process.env.FRONTEND_URL}/verify-email` +
      `?token=${encodeURIComponent(token)}`;

    await this.transporter.sendMail({
      from: `"Media AI" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Xác thực tài khoản của bạn',
      html: `
        <h2>Welcome!</h2>
        <p>Click the button below to verify your email address.</p>
        <a href="${verifyUrl}">
        Verify Email
        </a>
        <p>This link is valid for 15 minutes.</p>
      `,
    });
  }
}
