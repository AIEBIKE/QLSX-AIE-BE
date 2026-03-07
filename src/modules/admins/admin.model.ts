import mongoose, { Schema, Model } from "mongoose";
import { IAdmin } from "../../types";

const adminSchema = new Schema<IAdmin>(
    {
        accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
        name: { type: String, required: true, trim: true },
        dateOfBirth: { type: Date },
        citizenId: { type: String, trim: true },
        address: { type: String, trim: true },
    },
    { timestamps: true, versionKey: false }
);

const Admin: Model<IAdmin> = mongoose.model<IAdmin>("Admin", adminSchema);
export default Admin;
