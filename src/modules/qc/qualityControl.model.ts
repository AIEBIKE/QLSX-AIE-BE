import mongoose, { Schema, Document } from "mongoose";

export interface IQCResult {
    operationId: mongoose.Types.ObjectId;
    operationName?: string;
    processId?: mongoose.Types.ObjectId;
    processName?: string;
    status: "pass" | "fail";
    note?: string;
}

export interface IQualityControl extends Document {
    productionOrderId: mongoose.Types.ObjectId;
    frameNumber: string;
    engineNumber: string;
    color?: string;
    inspectionDate: Date;
    inspectorId: mongoose.Types.ObjectId;
    results: IQCResult[];
    status: "passed" | "failed";
    createdAt: Date;
    updatedAt: Date;
}

const QualityControlSchema: Schema = new Schema(
    {
        productionOrderId: {
            type: Schema.Types.ObjectId,
            ref: "ProductionOrder",
            required: true,
        },
        frameNumber: { type: String, required: true },
        engineNumber: { type: String, required: true },
        color: { type: String },
        inspectionDate: { type: Date, default: Date.now },
        inspectorId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
        results: [
            {
                operationId: { type: Schema.Types.ObjectId, ref: "Operation" },
                operationName: { type: String },
                processId: { type: Schema.Types.ObjectId, ref: "Process" },
                processName: { type: String },
                status: { type: String, enum: ["pass", "fail"], default: "pass" },
                note: { type: String },
            },
        ],
        status: { type: String, enum: ["pending", "passed", "failed"], default: "pending" },
    },
    { timestamps: true }
);

// Indexes
QualityControlSchema.index({ frameNumber: 1, engineNumber: 1 });
QualityControlSchema.index({ productionOrderId: 1 });
QualityControlSchema.index({ inspectionDate: 1 });
QualityControlSchema.index({ inspectorId: 1 });

export default mongoose.model<IQualityControl>("QualityControl", QualityControlSchema);
