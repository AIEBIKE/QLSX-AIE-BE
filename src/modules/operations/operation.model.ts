/**
 * =============================================
 * OPERATION MODEL - Model Thao Tác
 * =============================================
 * Thao tác là công việc cụ thể trong một công đoạn
 * Công nhân đăng ký thực hiện thao tác và được tính công
 * Ví dụ: "Lắp chân cổ trên đoạn vào khung", "Bắn ốc khung"
 */

import mongoose, { Schema, Model } from "mongoose";
import { IOperation } from "../../types";

/**
 * Schema định nghĩa cấu trúc dữ liệu Operation
 */
const operationSchema = new Schema<IOperation>(
  {
    // ==================== LIÊN KẾT ====================

    // Liên kết đến công đoạn (Process)
    processId: {
      type: Schema.Types.ObjectId,
      ref: "Process",
      required: [true, "Công đoạn là bắt buộc"],
    },

    // ==================== THÔNG TIN CƠ BẢN ====================

    // Tên thao tác chi tiết
    name: {
      type: String,
      required: [true, "Tên thao tác là bắt buộc"],
      trim: true,
    },

    // Mã thao tác - unique trong hệ thống
    // Format: {MÃ_XE}-TT{SỐ} (VD: AIEMS1-TT01)
    code: {
      type: String,
      required: [true, "Mã thao tác là bắt buộc"],
      unique: true,
      trim: true,
    },

    // ==================== ĐỘ KHÓ & NHÓM ====================

    // Độ khó (1-5)
    // 1: Đơn giản, 5: Rất khó
    difficulty: {
      type: Number,
      min: 1,
      max: 5,
      default: 1,
    },

    // Cho phép làm nhóm không
    // true = nhiều người cùng làm 1 thao tác
    allowTeamwork: {
      type: Boolean,
      default: false,
    },

    // Số công nhân tối đa cho thao tác này
    maxWorkers: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },

    // ==================== ĐỊNH MỨC SẢN XUẤT ====================

    // Số lượng tiêu chuẩn cần đạt (sản phẩm/ca)
    standardQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Thời gian tiêu chuẩn (phút) để hoàn thành standardQuantity
    standardMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Số phút làm việc trong 1 ca (mặc định 8 giờ = 480 phút)
    workingMinutesPerShift: {
      type: Number,
      default: 480,
      min: 1,
    },

    // ==================== HƯỚNG DẪN ====================

    // Hướng dẫn thực hiện thao tác
    instructions: {
      type: String,
      default: "",
    },

    // Mô tả / tiêu chuẩn chất lượng
    description: {
      type: String,
      default: "",
    },

    // ==================== TRẠNG THÁI ====================

    // Trạng thái hoạt động (soft delete)
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Tự động thêm createdAt, updatedAt
    versionKey: false, // Không dùng __v
  },
);

// ==================== INDEXES ====================

// Index để tối ưu query theo processId
operationSchema.index({ processId: 1 });

// Index để tìm kiếm theo code
operationSchema.index({ code: 1 });

// Tạo và export Model
const Operation: Model<IOperation> = mongoose.model<IOperation>(
  "Operation",
  operationSchema,
);

export default Operation;
