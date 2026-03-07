import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const migrate = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/quanlycongnhan";
        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB at", mongoUri);

        const db = mongoose.connection.db;

        // Fetch existing data manually to bypass Mongoose schema issues
        const users = await db.collection("users").find().toArray();
        const roles = await db.collection("roles").find().toArray();

        const roleMap = new Map(roles.map(r => [r._id.toString(), r]));

        console.log(`Found ${users.length} users and ${roles.length} roles`);

        // Clear new collections for fresh migration
        console.log("Clearing new collections...");
        await db.collection("accounts").deleteMany({});
        await db.collection("admins").deleteMany({});
        await db.collection("supervisors").deleteMany({});
        await db.collection("workers").deleteMany({});

        for (const user of users) {
            const role = roleMap.get(user.roleId?.toString());
            const roleCode = role?.code || user.role;

            let profileModel: "Admin" | "Supervisor" | "Worker" = "Worker";
            let profileData: any = {
                name: user.name,
                accountId: user._id,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            if (roleCode === "ADMIN" || roleCode === "admin") {
                profileModel = "Admin";
            } else if (roleCode === "SUPERVISOR" || roleCode === "FAC_MANAGER" || roleCode === "supervisor") {
                profileModel = "Supervisor";
                // User map factories_manage or factoryId for supervisor
                profileData.factory_belong_to = user.factories_manage || user.factoryId;
            } else {
                profileModel = "Worker";
                profileData.factoryId = user.factoryId;
            }

            console.log(`Migrating user ${user.code} (${roleCode}) to ${profileModel}...`);

            // 1. Create Profile
            const profileCollectionName = profileModel.toLowerCase() + "s"; // admins, supervisors, workers
            const profileResult = await db.collection(profileCollectionName).insertOne(profileData);
            const profileId = profileResult.insertedId;

            // 2. Create Account
            await db.collection("accounts").insertOne({
                _id: user._id,
                code: user.code,
                email: user.email,
                password: user.password,
                roleId: user.roleId,
                profileId: profileId,
                profileModel: profileModel,
                active: user.active !== undefined ? user.active : true,
                status: user.status || "approved",
                createdAt: user.createdAt || new Date(),
                updatedAt: user.updatedAt || new Date()
            });

            console.log(`  - Successfully migrated: ${user.code}`);
        }

        console.log("\nMigration completed successfully");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
};

migrate();
