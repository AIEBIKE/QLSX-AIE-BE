import mongoose, { Schema, Model } from "mongoose";
import { ISettings, BonusRules } from "../../types";

interface ISettingsModel extends Model<ISettings> {
  getDefaultBonusRules(): BonusRules;
}

const settingsSchema = new Schema<ISettings>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String, default: "" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, versionKey: false },
);

settingsSchema.statics.getDefaultBonusRules = function (): BonusRules {
  return {
    excellent: { minEfficiency: 110, bonusPercent: 20 },
    good: { minEfficiency: 100, bonusPercent: 10 },
    pass: { minEfficiency: 95, bonusPercent: 0 },
    warning: { minEfficiency: 85, bonusPercent: 0 },
    penalty: { minEfficiency: 0, penaltyPercent: 5 },
  };
};

const Settings = mongoose.model<ISettings, ISettingsModel>(
  "Settings",
  settingsSchema,
);

export default Settings;
