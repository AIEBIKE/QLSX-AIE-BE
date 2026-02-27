/**
 * =============================================
 * PROCESS MODEL - Model Công Đoạn
 * =============================================
 * Công đoạn là bước lớn trong quy trình sản xuất xe
 * Mỗi loại xe có nhiều công đoạn khác nhau
 * Ví dụ: Lắp khung, Lắp động cơ, Lắp điện...
 */

import mongoose, { Schema, Model } from "mongoose";
import { IProcess } from "../../types";

/**
 * Schema định nghĩa cấu trúc dữ liệu Process
 */
const processSchema = new Schema<IProcess>(
  {
    // Liên kết đến loại xe (VehicleType)
    vehicleTypeId: {
      type: Schema.Types.ObjectId,
      ref: "VehicleType",
      required: [true, "Loại xe là bắt buộc"],
    },

    // Tên công đoạn
    // Ví dụ: "Lắp khung & chân chống", "Lắp động cơ điện"
    name: {
      type: String,
      required: [true, "Tên công đoạn là bắt buộc"],
      trim: true,
    },

    // Mã công đoạn - unique trong hệ thống
    // Format: {MÃ_XE}-CD{SỐ} (VD: AIEMS1-CD01)
    code: {
      type: String,
      required: [true, "Mã công đoạn là bắt buộc"],
      unique: true,
      trim: true,
    },

    // Thứ tự công đoạn trong quy trình
    // Dùng để sắp xếp hiển thị
    order: {
      type: Number,
      default: 0,
    },

    // Mô tả chi tiết công đoạn
    description: {
      type: String,
      default: "",
    },

    // Trạng thái hoạt động (soft delete)
    // false = đã xóa (vẫn giữ trong DB)
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Tự động thêm createdAt, updatedAt
    versionKey: false, // Không dùng __v
    toJSON: { virtuals: true }, // Bao gồm virtuals khi chuyển JSON
    toObject: { virtuals: true },
  },
);

/**
 * Virtual: Liên kết đến danh sách Operations
 * Cho phép populate các thao tác thuộc công đoạn này
 */
processSchema.virtual("operations", {
  ref: "Operation",
  localField: "_id",
  foreignField: "processId",
});

/**
 * Compound Index để tối ưu query
 * Thường query theo vehicleTypeId và sắp xếp theo order
 */
processSchema.index({ vehicleTypeId: 1, order: 1 });

// Tạo và export Model
const Process: Model<IProcess> = mongoose.model<IProcess>(
  "Process",
  processSchema,
);

export default Process;
