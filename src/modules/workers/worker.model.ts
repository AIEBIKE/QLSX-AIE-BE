import mongoose, { Schema, Model } from "mongoose";
import { IWorker } from "../../types";

const workerSchema = new Schema<IWorker>(
    {
        accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
        name: { type: String, required: true, trim: true },
        dateOfBirth: { type: Date },
        citizenId: { type: String, trim: true },
        address: { type: String, trim: true },
        factoryId: { type: Schema.Types.ObjectId, ref: "Factory" },
    },
    { timestamps: true, versionKey: false }
);

const Worker: Model<IWorker> = mongoose.model<IWorker>("Worker", workerSchema);
export default Worker;
