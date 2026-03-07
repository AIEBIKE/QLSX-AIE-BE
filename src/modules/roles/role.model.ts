import mongoose, { Schema, Model } from "mongoose";
import { IRole } from "../../types";

const roleSchema = new Schema<IRole>(
    {
        name: {
            type: String,
            required: [true, "Tên vai trò là bắt buộc"],
            trim: true,
        },
        code: {
            type: String,
            required: [true, "Mã vai trò là bắt buộc"],
            unique: true,
            uppercase: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const Role: Model<IRole> = mongoose.model<IRole>("Role", roleSchema);

export default Role;
