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

  async sendCodeToResetPassword(to: string, code: string) {
    await this.transporter.sendMail({
      from: `"Media AI" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Mã xác thực đặt lại mật khẩu',
      html: `
      <div style="
        max-width: 500px;
        margin: 0 auto;
        padding: 24px;
        font-family: Arial, sans-serif;
        color: #333;
        background-color: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
      ">
        <h2 style="text-align: center; color: #2563eb;">
          Đặt lại mật khẩu
        </h2>

        <p>Xin chào,</p>

        <p>
          Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản
          Media AI của bạn. Vui lòng sử dụng mã xác thực bên dưới:
        </p>

        <div style="
          margin: 24px 0;
          padding: 16px;
          text-align: center;
          background-color: #f3f4f6;
          border-radius: 8px;
        ">
          <span style="
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #2563eb;
          ">
            ${code}
          </span>
        </div>

        <p>
          Mã xác thực có hiệu lực trong <strong>15 phút</strong>.
          Vui lòng không chia sẻ mã này với bất kỳ ai.
        </p>

        <p>
          Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb;" />

        <p style="
          text-align: center;
          font-size: 12px;
          color: #6b7280;
        ">
          © Media AI. All rights reserved.
        </p>
      </div>
    `,
    });
  }
}
