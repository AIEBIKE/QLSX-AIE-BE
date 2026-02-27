import mongoose, { Schema, Model } from "mongoose";
import { IWorkLog } from "../../types";

// LEGACY MODEL - Use DailyRegistration for new production flow
const workLogSchema = new Schema<IWorkLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    shiftId: { type: Schema.Types.ObjectId, ref: "Shift", required: true },
    processId: { type: Schema.Types.ObjectId, ref: "Process", required: true },
    operationId: {
      type: Schema.Types.ObjectId,
      ref: "Operation",
      required: true,
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date, default: null },
    durationMinutes: { type: Number, default: 0 },
    standardMinutes: { type: Number, required: true },
    quantity: { type: Number, default: 1 },
    deviation: { type: Number, default: 0 },
    efficiency: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["in_progress", "completed", "paused"],
      default: "in_progress",
    },
    note: { type: String, default: "" },
  },
  { timestamps: true, versionKey: false },
);

workLogSchema.index({ userId: 1, shiftId: 1 });
workLogSchema.index({ processId: 1 });
workLogSchema.index({ operationId: 1 });

const WorkLog: Model<IWorkLog> = mongoose.model<IWorkLog>(
  "WorkLog",
  workLogSchema,
);

export default WorkLog;
