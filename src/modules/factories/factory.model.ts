import mongoose, { Schema, Document } from "mongoose";

export interface IFactory extends Document {
    name: string;
    code: string;
    location?: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const FactorySchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        code: { type: String, required: true, unique: true },
        location: { type: String },
        active: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export default mongoose.model<IFactory>("Factory", FactorySchema);
