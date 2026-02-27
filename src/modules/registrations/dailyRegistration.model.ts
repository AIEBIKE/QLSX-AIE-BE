/**
 * =============================================
 * DAILY REGISTRATION MODEL - Model Đăng Ký Công Việc
 * =============================================
 * Ghi nhận việc công nhân đăng ký thực hiện thao tác
 * Theo dõi: số lượng thực hiện, thời gian, thưởng/phạt
 * Đây là dữ liệu chính để tính lương sản phẩm
 */

import mongoose, { Schema, Model } from "mongoose";
import { IDailyRegistration } from "../../types";

/**
 * Schema định nghĩa cấu trúc dữ liệu DailyRegistration
 */
const dailyRegistrationSchema = new Schema<IDailyRegistration>(
  {
    // ==================== LIÊN KẾT ====================

    // Công nhân thực hiện
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Ca làm việc
    shiftId: { type: Schema.Types.ObjectId, ref: "Shift", required: true },

    // Ngày làm việc
    date: { type: Date, required: true },

    // Lệnh sản xuất
    productionOrderId: {
      type: Schema.Types.ObjectId,
      ref: "ProductionOrder",
      required: true,
    },

    // Thao tác được đăng ký
    operationId: {
      type: Schema.Types.ObjectId,
      ref: "Operation",
      required: true,
    },

    // ==================== THỜI GIAN ĐĂNG KÝ ====================

    // Thời điểm đăng ký thao tác
    registeredAt: { type: Date, default: Date.now },

    // Trạng thái:
    // - registered: Đã đăng ký, chưa bắt đầu
    // - in_progress: Đang thực hiện
    // - completed: Đã hoàn thành
    // - reassigned: Đã chuyển cho người khác
    status: {
      type: String,
      enum: ["registered", "in_progress", "completed", "reassigned"],
      default: "registered",
    },

    // ==================== SẢN LƯỢNG ====================

    // Số lượng thực tế đạt được
    actualQuantity: { type: Number, default: null },

    // Số lượng kỳ vọng (theo định mức)
    expectedQuantity: { type: Number, required: true },

    // Chênh lệch = actualQuantity - expectedQuantity
    // Dương = vượt định mức, Âm = chưa đạt
    deviation: { type: Number, default: 0 },

    // ==================== GIÁN ĐOẠN ====================

    // Ghi chú lý do gián đoạn
    interruptionNote: { type: String, default: "" },

    // Số phút bị gián đoạn (máy hỏng, thiếu vật liệu...)
    interruptionMinutes: { type: Number, default: 0 },

    // ==================== THƯỞNG / PHẠT ====================

    // Số tiền thưởng (khi vượt định mức)
    bonusAmount: { type: Number, default: 0 },

    // Số tiền phạt (khi không đạt định mức)
    penaltyAmount: { type: Number, default: 0 },

    // ==================== ĐIỀU CHỈNH ====================

    // Người điều chỉnh (giám sát)
    adjustedBy: { type: Schema.Types.ObjectId, ref: "User" },

    // Số lượng kỳ vọng sau điều chỉnh
    adjustedExpectedQty: { type: Number },

    // Ghi chú điều chỉnh
    adjustmentNote: { type: String, default: "" },

    // ==================== THỜI GIAN LÀM VIỆC ====================

    // Số phút làm việc thực tế
    workingMinutes: { type: Number, default: 0 },

    // Thời điểm check-in bắt đầu thao tác
    checkInTime: { type: Date },

    // Thời điểm check-out kết thúc thao tác
    checkOutTime: { type: Date },

    // ==================== BỔ SUNG CÔNG NHÂN ====================

    // Có phải là công nhân bổ sung không
    isReplacement: { type: Boolean, default: false },

    // Thay thế cho công nhân nào
    replacesUserId: { type: Schema.Types.ObjectId, ref: "User" },

    // Lý do thay thế
    replacementReason: { type: String, default: "" },

    // Lý do về sớm
    earlyLeaveReason: { type: String, default: "" },
  },
  {
    timestamps: true, // Tự động thêm createdAt, updatedAt
    versionKey: false, // Không dùng __v
  },
);

// ==================== INDEXES ====================

// Index: Lấy registrations theo user và ngày
dailyRegistrationSchema.index({ userId: 1, date: 1 });

// Index: Lấy registrations theo lệnh sản xuất
dailyRegistrationSchema.index({ productionOrderId: 1 });

// Index: Thống kê theo operation và ngày
dailyRegistrationSchema.index({ operationId: 1, date: 1 });

// Tạo và export Model
const DailyRegistration: Model<IDailyRegistration> =
  mongoose.model<IDailyRegistration>(
    "DailyRegistration",
    dailyRegistrationSchema,
  );

export default DailyRegistration;
