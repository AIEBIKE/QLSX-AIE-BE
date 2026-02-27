/**
 * =============================================
 * EMAIL SERVICE - Dịch vụ gửi Email
 * =============================================
 * Sử dụng Nodemailer để gửi email
 * Hỗ trợ: Reset password, thông báo,...
 */

import nodemailer from "nodemailer";
import config from "./env";

/**
 * Interface cho email options
 */
interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Tạo transporter để gửi email
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465, // true cho port 465
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });
};

/**
 * Gửi email
 * @param options - Thông tin email (to, subject, html)
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    // Kiểm tra cấu hình SMTP
    if (!config.smtpUser || !config.smtpPass) {
      console.warn("⚠️  SMTP chưa được cấu hình. Email không được gửi.");
      console.log("📧 Email would be sent to:", options.to);
      console.log("📧 Subject:", options.subject);
      return true; // Trả về true trong dev mode
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"AI EBIKE System" <${config.smtpFrom}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to: ${options.to}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return false;
  }
};

/**
 * Gửi email reset password
 * @param email - Email người dùng
 * @param resetToken - Token reset password
 * @param userName - Tên người dùng
 */
export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
  userName: string,
): Promise<boolean> => {
  const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a56db; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .button { display: inline-block; background: #1a56db; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        .code { background: #e5e7eb; padding: 10px; font-family: monospace; font-size: 18px; 
                letter-spacing: 2px; text-align: center; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Đặt lại mật khẩu</h1>
        </div>
        <div class="content">
          <p>Xin chào <strong>${userName}</strong>,</p>
          <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
          <p>Nhấn nút bên dưới để đặt lại mật khẩu:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Đặt lại mật khẩu</a>
          </p>
          <p>Hoặc copy link sau vào trình duyệt:</p>
          <div class="code">${resetUrl}</div>
          <p><strong>⚠️ Lưu ý:</strong></p>
          <ul>
            <li>Link này có hiệu lực trong <strong>1 giờ</strong></li>
            <li>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này</li>
          </ul>
        </div>
        <div class="footer">
          <p>CÔNG TY CỔ PHẦN CÔNG NGHỆ XE ĐIỆN AI EBIKE</p>
          <p>Email này được gửi tự động, vui lòng không trả lời.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: "🔐 Đặt lại mật khẩu - AI EBIKE",
    html,
  });
};

/**
 * Gửi email chào mừng user mới đăng ký
 */
export const sendWelcomeEmail = async (
  email: string,
  userName: string,
  userCode: string,
): Promise<boolean> => {
  const loginUrl = `${config.frontendUrl}/login`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        .info-box { background: #d1fae5; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Chào mừng bạn!</h1>
        </div>
        <div class="content">
          <p>Xin chào <strong>${userName}</strong>,</p>
          <p>Tài khoản của bạn đã được tạo thành công trên hệ thống quản lý sản xuất AI EBIKE.</p>
          
          <div class="info-box">
            <p><strong>Thông tin đăng nhập:</strong></p>
            <p>📧 Mã nhân viên: <strong>${userCode}</strong></p>
            <p>🔑 Mật khẩu: Mật khẩu bạn đã nhập khi đăng ký</p>
          </div>
          
          <p style="text-align: center;">
            <a href="${loginUrl}" class="button">Đăng nhập ngay</a>
          </p>
          
          <p><strong>Lưu ý:</strong> Tài khoản của bạn cần được Admin phê duyệt trước khi có thể sử dụng đầy đủ chức năng.</p>
        </div>
        <div class="footer">
          <p>CÔNG TY CỔ PHẦN CÔNG NGHỆ XE ĐIỆN AI EBIKE</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: "🎉 Chào mừng bạn đến với AI EBIKE",
    html,
  });
};
