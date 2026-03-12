// [splinh] Model override thưởng/phạt theo nhà máy
import mongoose, { Schema, Model } from "mongoose";

export interface IFactoryStandardOverride {
  factoryId: mongoose.Types.ObjectId;
  standardId: mongoose.Types.ObjectId;
  bonusPerUnit: number;
  penaltyPerUnit: number;
}

const factoryStandardOverrideSchema = new Schema<IFactoryStandardOverride>(
  {
    factoryId: {
      type: Schema.Types.ObjectId,
      ref: "Factory",
      required: [true, "Nhà máy là bắt buộc"],
    },
    standardId: {
      type: Schema.Types.ObjectId,
      ref: "ProductionStandard",
      required: [true, "Định mức là bắt buộc"],
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
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

factoryStandardOverrideSchema.index(
  { factoryId: 1, standardId: 1 },
  { unique: true },
);

const FactoryStandardOverride: Model<IFactoryStandardOverride> =
  mongoose.model<IFactoryStandardOverride>(
    "FactoryStandardOverride",
    factoryStandardOverrideSchema,
  );

export default FactoryStandardOverride;
