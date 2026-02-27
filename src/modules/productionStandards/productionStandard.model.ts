import mongoose, { Schema, Model } from "mongoose";
import { IProductionStandard } from "../../types";

const productionStandardSchema = new Schema<IProductionStandard>(
  {
    vehicleTypeId: {
      type: Schema.Types.ObjectId,
      ref: "VehicleType",
      required: [true, "Loại xe là bắt buộc"],
    },
    operationId: {
      type: Schema.Types.ObjectId,
      ref: "Operation",
      required: [true, "Thao tác là bắt buộc"],
    },
    expectedQuantity: {
      type: Number,
      required: [true, "Sản lượng quy định là bắt buộc"],
      min: [1, "Sản lượng phải lớn hơn 0"],
    },
    bonusPerUnit: {
      type: Number,
      default: 0,
      min: 0,
    },
    penaltyPerUnit: {
      type: Number,
      default: 0,
      min: 0,
    },
    description: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

productionStandardSchema.index(
  { vehicleTypeId: 1, operationId: 1 },
  { unique: true },
);

const ProductionStandard: Model<IProductionStandard> =
  mongoose.model<IProductionStandard>(
    "ProductionStandard",
    productionStandardSchema,
  );

export default ProductionStandard;
