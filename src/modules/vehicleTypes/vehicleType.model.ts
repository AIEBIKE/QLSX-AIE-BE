/**
 * =============================================
 * VEHICLE TYPE MODEL - Model Loại Xe
 * =============================================
 * Định nghĩa các loại xe điện được sản xuất
 * Mỗi loại xe có quy trình sản xuất riêng
 * Ví dụ: AIE MS1, M1 Sport, Bee U AI, Swan AI...
 */

import mongoose, { Schema, Model } from "mongoose";
import { IVehicleType } from "../../types";

/**
 * Schema định nghĩa cấu trúc dữ liệu VehicleType
 */
const vehicleTypeSchema = new Schema<IVehicleType>(
  {
    // Tên loại xe
    // Ví dụ: "AIE MS1", "M1 Sport"
    name: {
      type: String,
      required: [true, "Tên loại xe là bắt buộc"],
      trim: true,
    },

    // Mã loại xe - unique trong hệ thống
    // Ví dụ: "AIEMS1", "M1SPORT"
    code: {
      type: String,
      required: [true, "Mã loại xe là bắt buộc"],
      unique: true,
      trim: true,
    },

    // Mô tả loại xe
    description: {
      type: String,
      default: "",
    },

    // Trạng thái hoạt động (soft delete)
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
 * Virtual: Liên kết đến danh sách Processes
 * Cho phép populate các công đoạn của loại xe này
 */
vehicleTypeSchema.virtual("processes", {
  ref: "Process",
  localField: "_id",
  foreignField: "vehicleTypeId",
});

// Tạo và export Model
const VehicleType: Model<IVehicleType> = mongoose.model<IVehicleType>(
  "VehicleType",
  vehicleTypeSchema,
);

export default VehicleType;
