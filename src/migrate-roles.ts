import mongoose from "mongoose";
import dotenv from "dotenv";
import Role from "./modules/roles/role.model";
import User from "./modules/auth/user.model";

dotenv.config();

const migrateRoles = async () => {
    try {
        console.log("🔗 Connecting to MongoDB...");
        await mongoose.connect(
            process.env.MONGODB_URI || "mongodb://localhost:27017/quanlycongnhan"
        );
        console.log("✅ Connected");

        // 1. Create Default Roles
        const rolesData = [
            { name: "Quản trị viên", code: "ADMIN", description: "Toàn quyền hệ thống" },
            { name: "Quản lý nhà máy", code: "FAC_MANAGER", description: "Quản lý tiến độ và nhân sự 1 nhà máy" },
            { name: "Giám sát (QA/QC)", code: "SUPERVISOR", description: "Kiểm soát chất lượng và tiêu chuẩn" },
            { name: "Công nhân", code: "WORKER", description: "Thực hiện lắp ráp và đăng ký sản lượng" },
        ];

        console.log("🎭 Creating roles...");
        for (const r of rolesData) {
            await Role.findOneAndUpdate({ code: r.code }, r, { upsert: true, new: true });
        }
        console.log("✅ Roles created/updated");

        const roles = await Role.find();
        const roleMap = roles.reduce((acc: any, curr: any) => {
            acc[curr.code] = curr._id;
            return acc;
        }, {});

        // 2. Migrate existing users
        console.log("👥 Migrating users...");
        const users = await User.find();
        for (const user of users) {
            let targetRoleCode = "WORKER";

            // Map old roles to new ones
            if (user.role === "admin") targetRoleCode = "ADMIN";
            else if (user.role === "supervisor") targetRoleCode = "FAC_MANAGER";
            else if (user.role === "worker") targetRoleCode = "WORKER";

            const roleId = roleMap[targetRoleCode];

            // For FAC_MANAGER, set factories_manage if factoryId exists
            const updateData: any = { roleId };
            if (targetRoleCode === "FAC_MANAGER" && user.factoryId) {
                updateData.factories_manage = user.factoryId;
            }

            await User.findByIdAndUpdate(user._id, updateData);
        }
        console.log(`✅ Migrated ${users.length} users`);

        console.log("\n🎉 Migration completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
};

migrateRoles();
