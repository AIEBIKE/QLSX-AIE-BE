import mongoose from "mongoose";
import "dotenv/config";
import Account from "../modules/auth/account.model";
import Admin from "../modules/admins/admin.model";
import Supervisor from "../modules/supervisors/supervisor.model";
import Worker from "../modules/workers/worker.model";
import Role from "../modules/roles/role.model";
import Factory from "../modules/factories/factory.model";

const testFlow = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log("Connected to MongoDB for testing");

        // Lấy Factory đầu tiên
        const factory = await Factory.findOne();
        if (!factory) {
            console.log("No factory found");
            return;
        }

        // Lấy Role Worker
        const roleWorker = await Role.findOne({ code: "WORKER" });
        if (!roleWorker) {
            console.log("No WORKER role found");
            return;
        }

        // Kiểm tra creation
        console.log("\n--- Testing Creation flow ---");
        const testCode = "TESTWORKER" + Math.floor(Math.random() * 1000);

        // Create Profile manually as simulating controller logic
        const profile = await Worker.create({
            name: "Test Worker Name",
            factoryId: factory._id,
            address: "123 Test Street",
        });

        const account = await Account.create({
            code: testCode,
            password: "hashedPassword123",
            roleId: roleWorker._id,
            profileId: profile._id,
            profileModel: "Worker",
            active: true,
            status: "approved"
        });

        profile.accountId = account._id;
        await profile.save();

        console.log(`Created test worker: ${testCode}`);

        // Test population (like the middleware does)
        const populatedAcc = await Account.findById(account._id)
            .populate("roleId")
            .populate("profileId");

        console.log("Populated Account:", {
            code: populatedAcc?.code,
            roleCode: (populatedAcc?.roleId as any)?.code,
            profileName: (populatedAcc?.profileId as any)?.name,
            profileFactory: (populatedAcc?.profileId as any)?.factoryId
        });

        // Clean up
        await Account.findByIdAndDelete(account._id);
        await Worker.findByIdAndDelete(profile._id);
        console.log("\n--- Cleanup successful ---");

    } catch (err) {
        console.error("Test failed", err);
    } finally {
        process.exit(0);
    }
};

testFlow();
