import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./modules/auth/user.model";
import VehicleType from "./modules/vehicleTypes/vehicleType.model";
import Process from "./modules/processes/process.model";
import Operation from "./modules/operations/operation.model";

dotenv.config();

const seedData = async () => {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/quanlycongnhan",
    );
    console.log("✅ Connected to MongoDB");

    // Check if users exist
    const existingUser = await User.findOne({ code: "ADMIN" });
    if (existingUser) {
      console.log("⚠️  Data already exists. Skipping seed.");
      process.exit(0);
    }

    // Seed Users
    const users = await User.create([
      {
        code: "ADMIN",
        name: "Administrator",
        password: "123456",
        role: "admin",
      },
      {
        code: "CN001",
        name: "Nguyễn Văn A",
        password: "123456",
        role: "worker",
        department: "Sản xuất",
      },
      {
        code: "CN002",
        name: "Trần Thị B",
        password: "123456",
        role: "worker",
        department: "Sản xuất",
      },
      {
        code: "CN003",
        name: "Lê Văn C",
        password: "123456",
        role: "worker",
        department: "Sản xuất",
      },
      {
        code: "GS001",
        name: "Phạm Văn D",
        password: "123456",
        role: "supervisor",
        department: "Sản xuất",
      },
    ]);
    console.log("✅ Created", users.length, "users");

    // Seed Vehicle Type
    const vehicleType = await VehicleType.create({
      code: "XD01",
      name: "Xe đạp điện model 1",
      description: "Xe đạp điện cơ bản",
      isActive: true,
    });
    console.log("✅ Created vehicle type");

    // Seed Processes
    const processes = await Process.create([
      {
        vehicleTypeId: vehicleType._id,
        code: "KHUNG",
        name: "Lắp khung",
        order: 1,
      },
      {
        vehicleTypeId: vehicleType._id,
        code: "DIEN",
        name: "Hệ thống điện",
        order: 2,
      },
      {
        vehicleTypeId: vehicleType._id,
        code: "DC",
        name: "Lắp động cơ",
        order: 3,
      },
      {
        vehicleTypeId: vehicleType._id,
        code: "HOAN",
        name: "Hoàn thiện",
        order: 4,
      },
    ]);
    console.log("✅ Created", processes.length, "processes");

    // Seed Operations
    const operations = await Operation.create([
      {
        processId: processes[0]._id,
        code: "KHUNG-01",
        name: "Lắp khung chính",
        standardQuantity: 100,
        difficulty: 3,
        maxWorkers: 2,
      },
      {
        processId: processes[0]._id,
        code: "KHUNG-02",
        name: "Hàn khung",
        standardQuantity: 80,
        difficulty: 4,
        maxWorkers: 1,
      },
      {
        processId: processes[1]._id,
        code: "DIEN-01",
        name: "Đấu nối dây điện",
        standardQuantity: 60,
        difficulty: 4,
        maxWorkers: 1,
      },
      {
        processId: processes[1]._id,
        code: "DIEN-02",
        name: "Lắp đèn",
        standardQuantity: 120,
        difficulty: 2,
        maxWorkers: 2,
      },
      {
        processId: processes[2]._id,
        code: "DC-01",
        name: "Lắp động cơ",
        standardQuantity: 50,
        difficulty: 5,
        maxWorkers: 2,
      },
      {
        processId: processes[3]._id,
        code: "HOAN-01",
        name: "Kiểm tra cuối",
        standardQuantity: 150,
        difficulty: 2,
        maxWorkers: 1,
      },
    ]);
    console.log("✅ Created", operations.length, "operations");

    console.log("\n🎉 Seed data completed!");
    console.log("\n📝 Login credentials:");
    console.log("   Admin: ADMIN / 123456");
    console.log("   Worker: CN001 / 123456");
    console.log("   Supervisor: GS001 / 123456");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  }
};

seedData();
