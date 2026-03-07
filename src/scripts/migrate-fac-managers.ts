import mongoose from "mongoose";
import dotenv from "dotenv";
import Account from "../modules/auth/account.model";
import Supervisor from "../modules/supervisors/supervisor.model";
import FactoryManager from "../modules/facManagers/facManager.model";
import Role from "../modules/roles/role.model";

dotenv.config();

const migrateFacManagers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log("Connected to MongoDB");

        const facManagerRoles = await Role.find({
            code: { $in: ["FAC_MANAGER", "fac_manager"] }
        });

        if (facManagerRoles.length === 0) {
            console.log("No FAC_MANAGER roles found.");
            process.exit(0);
        }

        const roleIds = facManagerRoles.map(r => r._id);

        const facManagerAccounts = await Account.find({
            roleId: { $in: roleIds },
            profileModel: "Supervisor"
        });

        console.log(`Found ${facManagerAccounts.length} fac_manager accounts to migrate.`);

        let migratedCount = 0;

        for (const account of facManagerAccounts) {
            // Find old supervisor profile
            const oldProfile = await Supervisor.findById(account.profileId);

            if (!oldProfile) {
                console.log(`Profile not found for account ${account.code}, skipping.`);
                continue;
            }

            // Check if FactoryManager already exists
            let newProfile = await FactoryManager.findOne({ accountId: account._id });

            if (!newProfile) {
                // Create new FactoryManager profile
                newProfile = await FactoryManager.create({
                    accountId: account._id,
                    factory_belong_to: oldProfile.factory_belong_to,
                    name: oldProfile.name,
                    dateOfBirth: oldProfile.dateOfBirth,
                    citizenId: oldProfile.citizenId,
                    address: oldProfile.address,
                });
            }

            // Update account reference
            account.profileId = newProfile._id as any;
            account.profileModel = "FactoryManager";
            await account.save();

            // Delete old supervisor profile
            await Supervisor.findByIdAndDelete(oldProfile._id);

            migratedCount++;
        }

        console.log(`Migration completed successfully. Migrated ${migratedCount} profiles.`);
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
};

migrateFacManagers();
