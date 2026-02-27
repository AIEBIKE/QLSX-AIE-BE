/**
 * =============================================
 * USER MODEL - Model Người Dùng
 * =============================================
 * Quản lý thông tin người dùng trong hệ thống
 * Bao gồm: Admin, Giám sát (supervisor), Công nhân (worker)
 */

import mongoose, { Schema, Model } from "mongoose";
import bcrypt from "bcryptjs";
import { IUser } from "../../types";

/**
 * Schema định nghĩa cấu trúc dữ liệu User
 */
const userSchema = new Schema<IUser>(
  {
    // Tên đầy đủ của người dùng
    name: {
      type: String,
      required: [true, "Tên là bắt buộc"],
      trim: true, // Tự động xóa khoảng trắng đầu/cuối
    },

    // Mã nhân viên - dùng để đăng nhập
    code: {
      type: String,
      required: [true, "Mã nhân viên là bắt buộc"],
      unique: true, // Không được trùng
      trim: true,
    },

    // Email - dùng để reset mật khẩu
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Email không hợp lệ"],
    },

    // Mật khẩu - được hash trước khi lưu
    password: {
      type: String,
      required: [true, "Mật khẩu là bắt buộc"],
      minlength: [6, "Mật khẩu phải có ít nhất 6 ký tự"],
      select: false, // Không trả về password khi query
    },

    // Vai trò trong hệ thống
    // - admin: Quản trị viên - toàn quyền
    // - supervisor: Giám sát - quản lý công nhân
    // - worker: Công nhân - thực hiện thao tác
    role: {
      type: String,
      enum: ["admin", "supervisor", "worker"],
      default: "worker",
    },

    // Phòng ban / Xưởng sản xuất
    department: {
      type: String,
      default: "",
    },

    // Trạng thái hoạt động
    // false = đã nghỉ việc hoặc bị vô hiệu hóa
    active: {
      type: Boolean,
      default: true,
    },

    // Trạng thái tài khoản (dùng cho workflow duyệt tài khoản)
    // pending: đang chờ admin duyệt
    // approved: đã được duyệt
    // rejected: bị từ chối
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved", // Backward compatibility - users hiện tại vẫn hoạt động
    },
  },
  {
    timestamps: true, // Tự động thêm createdAt, updatedAt
    versionKey: false, // Không dùng __v
  },
);

/**
 * Pre-save Hook: Hash mật khẩu trước khi lưu
 * Chỉ hash nếu password được thay đổi
 */
userSchema.pre("save", async function (next) {
  // Bỏ qua nếu password không thay đổi
  if (!this.isModified("password")) return next();

  // Hash password với salt rounds = 12
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

/**
 * Method: So sánh mật khẩu
 * @param candidatePassword - Mật khẩu người dùng nhập
 * @returns true nếu khớp, false nếu không khớp
 */
userSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Tạo và export Model
const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

export default User;
