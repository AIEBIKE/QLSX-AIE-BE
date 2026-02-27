/**
 * =============================================
 * SHIFT MODEL - Model Ca Làm Việc
 * =============================================
 * Quản lý ca làm việc của công nhân
 * Mỗi công nhân có 1 ca/ngày
 * Ca bao gồm: thời gian bắt đầu, kết thúc, tổng phút làm việc
 */

import mongoose, { Schema, Model } from "mongoose";
import { IShift } from "../../types";

/**
 * Schema định nghĩa cấu trúc dữ liệu Shift
 */
const shiftSchema = new Schema<IShift>(
  {
    // ==================== LIÊN KẾT ====================

    // Công nhân thực hiện ca này
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ==================== THỜI GIAN ====================

    // Ngày làm việc (chỉ lấy phần date, bỏ time)
    date: {
      type: Date,
      required: true,
    },

    // Thời điểm bắt đầu ca
    startTime: {
      type: Date,
      required: true,
    },

    // Thời điểm kết thúc ca
    // null = ca chưa kết thúc
    endTime: {
      type: Date,
      default: null,
    },

    // Tổng số phút làm việc thực tế
    // (đã trừ thời gian nghỉ, gián đoạn)
    totalWorkingMinutes: {
      type: Number,
      default: 0,
    },

    // ==================== TRẠNG THÁI ====================

    // Trạng thái ca:
    // - active: Đang làm việc
    // - completed: Đã kết thúc
    // - cancelled: Đã hủy
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
  },
  {
    timestamps: true, // Tự động thêm createdAt, updatedAt
    versionKey: false, // Không dùng __v
  },
);

// ==================== INDEXES ====================

/**
 * Compound Index: Tối ưu query theo user và ngày
 * Thường query: Lấy ca của user X trong ngày Y
 */
shiftSchema.index({ userId: 1, date: -1 });

// Tạo và export Model
const Shift: Model<IShift> = mongoose.model<IShift>("Shift", shiftSchema);

export default Shift;
