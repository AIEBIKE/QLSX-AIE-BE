import mongoose, { Schema, Document } from "mongoose";

export interface IQualityControl extends Document {
    productionOrderId: mongoose.Types.ObjectId;
    frameNumber: string;
    engineNumber: string;
    color?: string;
    inspectionDate: Date;
    inspectorId: mongoose.Types.ObjectId;
    results: {
        operationId: mongoose.Types.ObjectId;
        status: "pass" | "fail";
        note?: string;
    }[];
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
        inspectorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        results: [
            {
                operationId: { type: Schema.Types.ObjectId, ref: "Operation" },
                status: { type: String, enum: ["pass", "fail"], default: "pass" },
                note: { type: String },
            },
        ],
        status: { type: String, enum: ["passed", "failed"], default: "passed" },
    },
    { timestamps: true }
);

// Index for quick search by frame/engine
QualityControlSchema.index({ frameNumber: 1, engineNumber: 1 });
QualityControlSchema.index({ productionOrderId: 1 });

export default mongoose.model<IQualityControl>("QualityControl", QualityControlSchema);
