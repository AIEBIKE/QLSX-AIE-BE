/**
 * =============================================
 * PRODUCTION ORDER MODEL - Model Lệnh Sản Xuất
 * =============================================
 * Lệnh sản xuất là đơn đặt hàng sản xuất một lô xe
 * Theo dõi tiến độ từ lúc bắt đầu đến khi hoàn thành
 * Bao gồm: số khung, số máy, tiến độ từng công đoạn
 */

import mongoose, { Schema, Model } from "mongoose";
import { IProductionOrder } from "../../types";

/**
 * Schema định nghĩa cấu trúc dữ liệu ProductionOrder
 */
const productionOrderSchema = new Schema<IProductionOrder>(
  {
    // ==================== THÔNG TIN CƠ BẢN ====================

    // Mã lệnh sản xuất - unique
    // Format: LSX-{NĂM}-{SỐ} (VD: LSX-2026-001)
    orderCode: {
      type: String,
      required: [true, "Mã lệnh sản xuất là bắt buộc"],
      unique: true,
      trim: true,
    },

    // Loại xe cần sản xuất
    vehicleTypeId: {
      type: Schema.Types.ObjectId,
      ref: "VehicleType",
      required: [true, "Loại xe là bắt buộc"],
    },

    // Số lượng xe cần sản xuất
    quantity: {
      type: Number,
      required: [true, "Số lượng là bắt buộc"],
      min: [1, "Số lượng phải lớn hơn 0"],
    },

    // ==================== SỐ KHUNG & SỐ MÁY ====================

    // Danh sách số khung xe
    frameNumbers: [{ type: String, trim: true }],

    // Danh sách số máy (động cơ)
    engineNumbers: [{ type: String, trim: true }],

    // ==================== THỜI GIAN ====================

    // Ngày bắt đầu sản xuất
    startDate: {
      type: Date,
      required: [true, "Ngày bắt đầu là bắt buộc"],
    },

    // Ngày dự kiến hoàn thành
    expectedEndDate: Date,

    // Ngày hoàn thành thực tế
    actualEndDate: Date,

    // ==================== TRẠNG THÁI ====================

    // Trạng thái lệnh sản xuất:
    // - pending: Chờ bắt đầu
    // - in_progress: Đang sản xuất
    // - completed: Đã hoàn thành
    // - cancelled: Đã hủy
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "cancelled"],
      default: "pending",
    },

    // Người tạo lệnh sản xuất
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Ghi chú
    note: {
      type: String,
      default: "",
    },

    // ==================== TIẾN ĐỘ CÔNG ĐOẠN ====================

    // Theo dõi tiến độ từng công đoạn
    processProgress: [
      {
        // ID công đoạn
        processId: { type: Schema.Types.ObjectId, ref: "Process" },

        // Tên công đoạn (lưu để hiển thị nhanh)
        processName: { type: String },

        // Số lượng cần hoàn thành
        requiredQuantity: { type: Number, default: 0 },

        // Số lượng đã hoàn thành
        completedQuantity: { type: Number, default: 0 },

        // Trạng thái công đoạn
        status: {
          type: String,
          enum: ["pending", "in_progress", "completed"],
          default: "pending",
        },
      },
    ],

    // ==================== LỊCH SỬ KIỂM TRA ====================

    // Lịch sử kiểm tra hoàn thành lệnh
    completionChecks: [
      {
        // Thời điểm kiểm tra
        checkedAt: { type: Date },

        // Người kiểm tra
        checkedBy: { type: Schema.Types.ObjectId, ref: "User" },

        // Có thể hoàn thành không
        canComplete: { type: Boolean },

        // Danh sách công đoạn chưa hoàn thành
        incompleteProcesses: [
          {
            processId: { type: Schema.Types.ObjectId },
            processName: { type: String },
            remaining: { type: Number }, // Số lượng còn thiếu
          },
        ],
      },
    ],
  },
  {
    timestamps: true, // Tự động thêm createdAt, updatedAt
    versionKey: false, // Không dùng __v
  },
);

// ==================== INDEXES ====================

// Index để tìm kiếm theo mã lệnh
productionOrderSchema.index({ orderCode: 1 });

// Index để lọc theo trạng thái
productionOrderSchema.index({ status: 1 });

// Tạo và export Model
const ProductionOrder: Model<IProductionOrder> =
  mongoose.model<IProductionOrder>("ProductionOrder", productionOrderSchema);

export default ProductionOrder;
