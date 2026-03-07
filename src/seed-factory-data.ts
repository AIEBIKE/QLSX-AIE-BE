import mongoose from "mongoose";
import dotenv from "dotenv";
import Factory from "./modules/factories/factory.model";
import User from "./modules/auth/user.model";
import VehicleType from "./modules/vehicleTypes/vehicleType.model";
import Operation from "./modules/operations/operation.model";
import ProductionStandard from "./modules/productionStandards/productionStandard.model";

dotenv.config();

const seedFactoryData = async () => {
    try {
        console.log("🔗 Đang kết nối MongoDB...");
        await mongoose.connect(
            process.env.MONGODB_URI || "mongodb://localhost:27017/quanlycongnhan"
        );
        console.log("✅ Đã kết nối");

        // 1. Tạo Nhà Máy
        console.log("🏭 Đang tạo nhà máy...");
        await Factory.deleteMany({}); // Xóa cũ để tránh duplicate code
        const factories = await Factory.create([
            { name: "Nhà máy A (Hà Nội)", code: "FACTORY_A", location: "KCN Thăng Long, Hà Nội", active: true },
            { name: "Nhà máy B (Bình Dương)", code: "FACTORY_B", location: "KCN VSIP, Bình Dương", active: true }
        ]);
        console.log(`✅ Đã tạo ${factories.length} nhà máy`);

        // 2. Lấy dữ liệu mẫu (Xe & Thao tác)
        let vehicleType = await VehicleType.findOne({ code: "XD01" });
        if (!vehicleType) {
            vehicleType = await VehicleType.findOne();
        }

        if (!vehicleType) {
            console.error("❌ Không tìm thấy loại xe nào. Vui lòng chạy 'npm run seed' trước.");
            process.exit(1);
        }
        console.log(`🚲 Sử dụng loại xe: ${vehicleType.name} (${vehicleType.code})`);

        const operations = await Operation.find().limit(5);
        if (operations.length === 0) {
            console.error("❌ Không tìm thấy thao tác nào. Vui lòng chạy 'npm run seed' trước.");
            process.exit(1);
        }

        // 3. Tạo Giám sát & Công nhân cho từng nhà máy
        console.log("👥 Đang tạo người dùng cho các nhà máy...");
        const factoryUsers = [
            // Nhà máy A
            { code: "GS_A", name: "Giám sát A", role: "supervisor", factoryId: factories[0]._id, password: "123456" },
            { code: "CN_A1", name: "Công nhân A1", role: "worker", factoryId: factories[0]._id, password: "123456" },
            { code: "CN_A2", name: "Công nhân A2", role: "worker", factoryId: factories[0]._id, password: "123456" },
            // Nhà máy B
            { code: "GS_B", name: "Giám sát B", role: "supervisor", factoryId: factories[1]._id, password: "123456" },
            { code: "CN_B1", name: "Công nhân B1", role: "worker", factoryId: factories[1]._id, password: "123456" },
            { code: "CN_B2", name: "Công nhân B2", role: "worker", factoryId: factories[1]._id, password: "123456" }
        ];

        for (const u of factoryUsers) {
            const existing = await User.findOne({ code: u.code });
            if (!existing) {
                await User.create(u);
            } else {
                await User.updateOne({ code: u.code }, { factoryId: u.factoryId });
            }
        }
        console.log("✅ Đã cập nhật/tạo người dùng theo nhà máy");

        // 4. Tạo Định mức sản xuất (Production Standards) cho từng nhà máy
        console.log("📈 Đang tạo định mức sản xuất riêng cho từng nhà máy...");
        const standardsData = [];

        // Nhà máy A: Thưởng cao, phạt thấp
        for (const op of operations) {
            standardsData.push({
                vehicleTypeId: vehicleType._id,
                operationId: op._id,
                factoryId: factories[0]._id,
                expectedQuantity: 100,
                bonusPerUnit: 2000,
                penaltyPerUnit: 500,
                description: "Định mức tại Nhà máy Hà Nội"
            });
        }

        // Nhà máy B: Thưởng trung bình, phạt trung bình
        for (const op of operations) {
            standardsData.push({
                vehicleTypeId: vehicleType._id,
                operationId: op._id,
                factoryId: factories[1]._id,
                expectedQuantity: 80,
                bonusPerUnit: 1500,
                penaltyPerUnit: 1000,
                description: "Định mức tại Nhà máy Bình Dương"
            });
        }

        await ProductionStandard.deleteMany({}); // Xóa định mức cũ để tránh duplicate index
        await ProductionStandard.insertMany(standardsData);
        console.log(`✅ Đã tạo ${standardsData.length} định mức sản xuất`);

        console.log("\n🎉 Hoàn tất nạp dữ liệu mẫu!");
        console.log("-----------------------------------");
        console.log("📍 Nhà máy A: GS_A / 123456");
        console.log("📍 Nhà máy B: GS_B / 123456");
        console.log("📍 Công nhân: CN_A1, CN_B1... / 123456");
        console.log("-----------------------------------");

        process.exit(0);
    } catch (error) {
        console.error("❌ Lỗi nạp dữ liệu:", error);
        process.exit(1);
    }
};

seedFactoryData();
