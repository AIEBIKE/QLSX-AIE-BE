/**
 * =============================================
 * PASSWORD RESET TOKEN MODEL - Token Reset Mật khẩu
 * =============================================
 * Lưu token để xác minh yêu cầu đặt lại mật khẩu
 * Token có thời hạn 1 giờ
 */

import mongoose, { Schema, Model, Document, Types } from "mongoose";
import crypto from "crypto";

/**
 * Interface cho PasswordResetToken
 */
export interface IPasswordResetToken extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const passwordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    // Liên kết đến user
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Token random (đã hash)
    token: {
      type: String,
      required: true,
    },

    // Thời gian hết hạn (mặc định 1 giờ)
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },

    // Đã sử dụng chưa
    used: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Index để tự động xóa token hết hạn
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index để tìm token nhanh
passwordResetTokenSchema.index({ token: 1 });

/**
 * Static method: Tạo token mới
 */
passwordResetTokenSchema.statics.createToken = async function (
  userId: Types.ObjectId,
): Promise<string> {
  // Xóa các token cũ của user
  await this.deleteMany({ userId });

  // Tạo token random
  const rawToken = crypto.randomBytes(32).toString("hex");

  // Hash token trước khi lưu
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  // Lưu vào database
  await this.create({
    userId,
    token: hashedToken,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  });

  // Trả về token chưa hash (để gửi cho user)
  return rawToken;
};

/**
 * Static method: Xác minh token
 */
passwordResetTokenSchema.statics.verifyToken = async function (
  rawToken: string,
): Promise<IPasswordResetToken | null> {
  // Hash token để so sánh
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  // Tìm token chưa sử dụng và chưa hết hạn
  const tokenDoc = await this.findOne({
    token: hashedToken,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  return tokenDoc;
};

// Interface cho model với static methods
interface IPasswordResetTokenModel extends Model<IPasswordResetToken> {
  createToken(userId: Types.ObjectId): Promise<string>;
  verifyToken(rawToken: string): Promise<IPasswordResetToken | null>;
}

const PasswordResetToken: IPasswordResetTokenModel = mongoose.model<
  IPasswordResetToken,
  IPasswordResetTokenModel
>("PasswordResetToken", passwordResetTokenSchema);

export default PasswordResetToken;
