/**
 * =============================================
 * EMAIL CONFIG - Cấu hình Email
 * =============================================
 * Cấu hình SMTP để gửi email reset password
 */

import dotenv from "dotenv";

dotenv.config();

/**
 * Interface cho config
 */
interface Config {
  port: number;
  mongoUri: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  nodeEnv: string;
  // Email config
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  frontendUrl: string;
}

const config: Config = {
  // Server
  port: parseInt(process.env.PORT || "5000", 10),
  mongoUri:
    process.env.MONGODB_URI || "mongodb://localhost:27017/quanlycongnhan",
  jwtSecret: process.env.JWT_SECRET || "your-secret-key",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  nodeEnv: process.env.NODE_ENV || "development",

  // Email SMTP (dùng Gmail, Mailgun, SendGrid,...)
  smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
  smtpPort: parseInt(process.env.SMTP_PORT || "587", 10),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "noreply@aiebike.vn",

  // Frontend URL cho link reset password
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
};

export default config;
