import mongoose, { Schema, Model } from "mongoose";
import { ISupervisor } from "../../types";

const supervisorSchema = new Schema<ISupervisor>(
    {
        accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
        name: { type: String, required: true, trim: true },
        dateOfBirth: { type: Date },
        citizenId: { type: String, trim: true },
        address: { type: String, trim: true },
        factory_belong_to: { type: Schema.Types.ObjectId, ref: "Factory" },
    },
    { timestamps: true, versionKey: false }
);

const Supervisor: Model<ISupervisor> = mongoose.model<ISupervisor>(
    "Supervisor",
    supervisorSchema
);
export default Supervisor;
