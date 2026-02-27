/**
 * =============================================
 * DAILY REPORT MODEL - Model Báo Cáo Ngày
 * =============================================
 * Tổng hợp kết quả làm việc của công nhân trong ngày
 * Tính toán: hiệu suất, thưởng, phạt
 * Dùng để báo cáo và tính lương
 */

import mongoose, { Schema, Model } from "mongoose";
import { IDailyReport } from "../../types";

/**
 * Schema định nghĩa cấu trúc dữ liệu DailyReport
 */
const dailyReportSchema = new Schema<IDailyReport>(
  {
    // ==================== LIÊN KẾT ====================

    // Công nhân
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Ca làm việc
    shiftId: { type: Schema.Types.ObjectId, ref: "Shift", required: true },

    // Ngày báo cáo
    date: { type: Date, required: true },

    // ==================== THỜI GIAN ====================

    // Tổng số phút làm việc thực tế
    totalWorkingMinutes: { type: Number, default: 0 },

    // Tổng số phút tiêu chuẩn (quy đổi theo định mức)
    // Nếu > totalWorkingMinutes = làm nhanh hơn định mức
    totalStandardMinutes: { type: Number, default: 0 },

    // ==================== HIỆU SUẤT ====================

    // Số thao tác đã hoàn thành
    totalOperations: { type: Number, default: 0 },

    // Phần trăm hiệu suất
    // = (totalStandardMinutes / totalWorkingMinutes) * 100
    // > 100% = vượt định mức
    // < 100% = chưa đạt định mức
    efficiencyPercent: { type: Number, default: 0 },

    // ==================== THƯỞNG / PHẠT ====================

    // Tổng tiền thưởng trong ngày
    bonusAmount: { type: Number, default: 0 },

    // Tổng tiền phạt trong ngày
    penaltyAmount: { type: Number, default: 0 },

    // Kết quả cuối cùng:
    // - bonus: Được thưởng (bonusAmount > penaltyAmount)
    // - penalty: Bị phạt (penaltyAmount > bonusAmount)
    // - neutral: Hòa vốn
    finalResult: {
      type: String,
      enum: ["bonus", "penalty", "neutral"],
      default: "neutral",
    },
  },
  {
    timestamps: true, // Tự động thêm createdAt, updatedAt
    versionKey: false, // Không dùng __v
  },
);

// ==================== INDEXES ====================

// Index: Lấy báo cáo theo user và ngày (mới nhất trước)
dailyReportSchema.index({ userId: 1, date: -1 });

// Tạo và export Model
const DailyReport: Model<IDailyReport> = mongoose.model<IDailyReport>(
  "DailyReport",
  dailyReportSchema,
);

export default DailyReport;
