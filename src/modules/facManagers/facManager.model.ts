import mongoose, { Schema, Model } from "mongoose";
import { IFactoryManager } from "../../types";

const factoryManagerSchema = new Schema<IFactoryManager>(
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


const FactoryManager: Model<IFactoryManager> = mongoose.model<IFactoryManager>(
    "FactoryManager",
    factoryManagerSchema
);

export default FactoryManager;
