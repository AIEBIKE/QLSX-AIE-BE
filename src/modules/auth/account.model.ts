import mongoose, { Schema, Model } from "mongoose";
import bcrypt from "bcryptjs";
import { IAccount } from "../../types";

const accountSchema = new Schema<IAccount>(
    {
        code: {
            type: String,
            required: [true, "Mã nhân viên là bắt buộc"],
            unique: true,
            trim: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, "Email không hợp lệ"],
        },
        password: {
            type: String,
            required: [true, "Mật khẩu là bắt buộc"],
            minlength: [6, "Mật khẩu phải có ít nhất 6 ký tự"],
            select: false,
        },
        roleId: {
            type: Schema.Types.ObjectId,
            ref: "Role",
            required: true,
        },
        profileId: {
            type: Schema.Types.ObjectId,
            required: true,
            refPath: "profileModel",
        },
        profileModel: {
            type: String,
            required: true,
            enum: ["Admin", "Supervisor", "Worker", "FactoryManager"],
        },
        active: {
            type: Boolean,
            default: true,
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "approved",
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

accountSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

accountSchema.methods.comparePassword = async function (
    candidatePassword: string,
): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

const Account: Model<IAccount> = mongoose.model<IAccount>("Account", accountSchema);
export default Account;
