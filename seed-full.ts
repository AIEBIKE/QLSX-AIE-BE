/**
 * SEED FULL DATA - Dữ liệu mẫu đầy đủ cho tất cả các module
 * Chạy: npm run seed:full
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

// Import all models
import User from "./src/modules/auth/user.model";
import VehicleType from "./src/modules/vehicleTypes/vehicleType.model";
import Process from "./src/modules/processes/process.model";
import Operation from "./src/modules/operations/operation.model";
import ProductionStandard from "./src/modules/productionStandards/productionStandard.model";
import ProductionOrder from "./src/modules/productionOrders/productionOrder.model";
import Shift from "./src/modules/shifts/shift.model";
import DailyRegistration from "./src/modules/registrations/dailyRegistration.model";
import DailyReport from "./src/modules/reports/dailyReport.model";
import Settings from "./src/modules/settings/settings.model";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/qlsx";

// Helper: tạo ngày trong tháng hiện tại
const getDate = (daysAgo: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(8, 0, 0, 0);
  return date;
};

const seedFullData = async () => {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // ========== CLEAR ALL DATA ==========
    console.log("\n🗑️  Clearing all existing data...");
    await Promise.all([
      User.deleteMany({}),
      VehicleType.deleteMany({}),
      Process.deleteMany({}),
      Operation.deleteMany({}),
      ProductionStandard.deleteMany({}),
      ProductionOrder.deleteMany({}),
      Shift.deleteMany({}),
      DailyRegistration.deleteMany({}),
      DailyReport.deleteMany({}),
      Settings.deleteMany({}),
    ]);
    console.log("✅ All data cleared");

    // ========== 1. USERS ==========
    console.log("\n👥 Creating Users...");
    const plainPassword = "123456"; // Model sẽ tự hash qua pre-save hook

    const users = await User.create([
      // Admin
      {
        code: "ADMIN",
        name: "Quản trị viên",
        password: plainPassword,
        role: "admin",
        department: "Quản lý",
        active: true,
      },
      // Supervisors
      {
        code: "GS001",
        name: "Trần Văn Giám",
        password: plainPassword,
        role: "supervisor",
        department: "Xưởng sản xuất 1",
        active: true,
      },
      {
        code: "GS002",
        name: "Lê Thị Sát",
        password: plainPassword,
        role: "supervisor",
        department: "Xưởng sản xuất 2",
        active: true,
      },
      // Workers - Xưởng 1
      {
        code: "CN001",
        name: "Nguyễn Văn An",
        password: plainPassword,
        role: "worker",
        department: "Xưởng sản xuất 1",
        active: true,
      },
      {
        code: "CN002",
        name: "Trần Thị Bình",
        password: plainPassword,
        role: "worker",
        department: "Xưởng sản xuất 1",
        active: true,
      },
      {
        code: "CN003",
        name: "Lê Văn Cường",
        password: plainPassword,
        role: "worker",
        department: "Xưởng sản xuất 1",
        active: true,
      },
      {
        code: "CN004",
        name: "Phạm Thị Dung",
        password: plainPassword,
        role: "worker",
        department: "Xưởng sản xuất 1",
        active: true,
      },
      {
        code: "CN005",
        name: "Hoàng Văn Em",
        password: plainPassword,
        role: "worker",
        department: "Xưởng sản xuất 1",
        active: true,
      },
      // Workers - Xưởng 2
      {
        code: "CN006",
        name: "Vũ Thị Phương",
        password: plainPassword,
        role: "worker",
        department: "Xưởng sản xuất 2",
        active: true,
      },
      {
        code: "CN007",
        name: "Đặng Văn Giang",
        password: plainPassword,
        role: "worker",
        department: "Xưởng sản xuất 2",
        active: true,
      },
      {
        code: "CN008",
        name: "Bùi Thị Hoa",
        password: plainPassword,
        role: "worker",
        department: "Xưởng sản xuất 2",
        active: true,
      },
    ]);
    console.log(`✅ Created ${users.length} users`);

    // ========== 2. VEHICLE TYPES ==========
    console.log("\n🏍️  Creating Vehicle Types...");
    const vehicleTypes = await VehicleType.create([
      {
        code: "M1SPORT",
        name: "M1 Sport",
        description: "Xe điện thể thao M1 Sport",
        active: true,
      },
      {
        code: "BEEUAI",
        name: "Bee U AI",
        description: "Xe điện Bee U AI",
        active: true,
      },
      {
        code: "CAMELOI8",
        name: "Camelo I8 AI",
        description: "Xe điện cao cấp Camelo I8 AI",
        active: true,
      },
      {
        code: "SWANAI",
        name: "Swan AI",
        description: "Xe điện Swan AI",
        active: true,
      },
    ]);
    console.log(`✅ Created ${vehicleTypes.length} vehicle types`);

    // ========== 3. PROCESSES (cho từng loại xe) ==========
    console.log("\n⚙️  Creating Processes...");
    const processTemplates = [
      {
        code: "CD01",
        name: "Chuẩn bị vật liệu",
        order: 1,
        description: "Kiểm tra và chuẩn bị nguyên vật liệu",
      },
      {
        code: "CD02",
        name: "Lắp ráp khung sườn",
        order: 2,
        description: "Lắp ráp khung xe chính",
      },
      {
        code: "CD03",
        name: "Lắp động cơ",
        order: 3,
        description: "Lắp động cơ và hệ thống truyền động",
      },
      {
        code: "CD04",
        name: "Hệ thống điện",
        order: 4,
        description: "Đấu nối hệ thống điện tử",
      },
      {
        code: "CD05",
        name: "Hệ thống phanh",
        order: 5,
        description: "Lắp phanh đĩa/phanh tang trống",
      },
      {
        code: "CD06",
        name: "Lắp bánh xe",
        order: 6,
        description: "Lắp lốp và vành xe",
      },
      {
        code: "CD07",
        name: "Hoàn thiện ngoại thất",
        order: 7,
        description: "Lắp vỏ xe, đèn, gương",
      },
      {
        code: "CD08",
        name: "Hoàn thiện nội thất",
        order: 8,
        description: "Lắp yên, tay lái",
      },
      {
        code: "CD09",
        name: "Kiểm tra chất lượng",
        order: 9,
        description: "Kiểm tra tổng thể",
      },
      {
        code: "CD10",
        name: "Chạy thử & xuất xưởng",
        order: 10,
        description: "Test và hoàn thiện",
      },
    ];

    const allProcesses: any[] = [];
    for (const vt of vehicleTypes) {
      for (const pt of processTemplates) {
        const process = await Process.create({
          vehicleTypeId: vt._id,
          code: `${vt.code}-${pt.code}`,
          name: pt.name,
          order: pt.order,
          description: pt.description,
          active: true,
        });
        allProcesses.push(process);
      }
    }
    console.log(`✅ Created ${allProcesses.length} processes`);

    // ========== 4. OPERATIONS ==========
    console.log("\n🔧 Creating Operations...");
    const operationTemplates = [
      // CD01 - Chuẩn bị
      {
        processOrder: 1,
        ops: [
          {
            name: "Kiểm tra vật liệu nhập kho",
            standardQty: 50,
            standardMin: 60,
            difficulty: 1,
          },
          {
            name: "Phân loại linh kiện",
            standardQty: 100,
            standardMin: 90,
            difficulty: 1,
          },
        ],
      },
      // CD02 - Khung
      {
        processOrder: 2,
        ops: [
          {
            name: "Hàn khung sườn",
            standardQty: 20,
            standardMin: 120,
            difficulty: 3,
          },
          {
            name: "Lắp chân chống",
            standardQty: 40,
            standardMin: 60,
            difficulty: 1,
          },
          { name: "Lắp baga", standardQty: 50, standardMin: 45, difficulty: 1 },
        ],
      },
      // CD03 - Động cơ
      {
        processOrder: 3,
        ops: [
          {
            name: "Lắp động cơ vào khung",
            standardQty: 15,
            standardMin: 120,
            difficulty: 4,
          },
          {
            name: "Kết nối hệ thống xả",
            standardQty: 25,
            standardMin: 60,
            difficulty: 2,
          },
          {
            name: "Lắp bình xăng",
            standardQty: 40,
            standardMin: 45,
            difficulty: 2,
          },
        ],
      },
      // CD04 - Điện
      {
        processOrder: 4,
        ops: [
          {
            name: "Đấu nối dây điện chính",
            standardQty: 20,
            standardMin: 90,
            difficulty: 3,
          },
          {
            name: "Lắp còi và công tắc",
            standardQty: 35,
            standardMin: 45,
            difficulty: 2,
          },
          {
            name: "Lắp đồng hồ taplo",
            standardQty: 30,
            standardMin: 60,
            difficulty: 2,
          },
        ],
      },
      // CD05 - Phanh
      {
        processOrder: 5,
        ops: [
          {
            name: "Lắp phanh trước",
            standardQty: 30,
            standardMin: 60,
            difficulty: 2,
          },
          {
            name: "Lắp phanh sau",
            standardQty: 30,
            standardMin: 60,
            difficulty: 2,
          },
          {
            name: "Đổ dầu phanh",
            standardQty: 50,
            standardMin: 30,
            difficulty: 1,
          },
        ],
      },
      // CD06 - Bánh xe
      {
        processOrder: 6,
        ops: [
          {
            name: "Lắp bánh trước",
            standardQty: 35,
            standardMin: 45,
            difficulty: 2,
          },
          {
            name: "Lắp bánh sau",
            standardQty: 35,
            standardMin: 45,
            difficulty: 2,
          },
          {
            name: "Căn chỉnh bánh xe",
            standardQty: 40,
            standardMin: 30,
            difficulty: 2,
          },
        ],
      },
      // CD07 - Ngoại thất
      {
        processOrder: 7,
        ops: [
          {
            name: "Lắp ốp nhựa thân xe",
            standardQty: 25,
            standardMin: 90,
            difficulty: 2,
          },
          {
            name: "Lắp đèn pha",
            standardQty: 40,
            standardMin: 45,
            difficulty: 2,
          },
          {
            name: "Lắp đèn hậu",
            standardQty: 45,
            standardMin: 40,
            difficulty: 1,
          },
          {
            name: "Lắp gương chiếu hậu",
            standardQty: 60,
            standardMin: 30,
            difficulty: 1,
          },
        ],
      },
      // CD08 - Nội thất
      {
        processOrder: 8,
        ops: [
          {
            name: "Lắp yên xe",
            standardQty: 50,
            standardMin: 36,
            difficulty: 1,
          },
          {
            name: "Lắp tay lái",
            standardQty: 40,
            standardMin: 45,
            difficulty: 2,
          },
          {
            name: "Lắp tay nắm",
            standardQty: 60,
            standardMin: 30,
            difficulty: 1,
          },
        ],
      },
      // CD09 - Kiểm tra
      {
        processOrder: 9,
        ops: [
          {
            name: "Kiểm tra hệ thống điện",
            standardQty: 30,
            standardMin: 60,
            difficulty: 3,
          },
          {
            name: "Kiểm tra phanh",
            standardQty: 40,
            standardMin: 45,
            difficulty: 2,
          },
          {
            name: "Kiểm tra động cơ",
            standardQty: 25,
            standardMin: 72,
            difficulty: 3,
          },
        ],
      },
      // CD10 - Hoàn thiện
      {
        processOrder: 10,
        ops: [
          {
            name: "Chạy thử trên đường",
            standardQty: 15,
            standardMin: 120,
            difficulty: 3,
          },
          {
            name: "Vệ sinh xe",
            standardQty: 20,
            standardMin: 30,
            difficulty: 1,
          },
          {
            name: "Dán tem và xuất xưởng",
            standardQty: 40,
            standardMin: 45,
            difficulty: 1,
          },
        ],
      },
    ];

    const allOperations: any[] = [];
    let opIndex = 1;

    for (const vt of vehicleTypes) {
      const vtProcesses = allProcesses.filter(
        (p) => p.vehicleTypeId.toString() === vt._id.toString(),
      );

      for (const template of operationTemplates) {
        const process = vtProcesses.find(
          (p) => p.order === template.processOrder,
        );
        if (!process) continue;

        for (const op of template.ops) {
          const operation = await Operation.create({
            processId: process._id,
            code: `${vt.code}-TT${String(opIndex).padStart(3, "0")}`,
            name: op.name,
            difficulty: op.difficulty,
            standardQuantity: op.standardQty,
            standardMinutes: op.standardMin,
            workingMinutesPerShift: 480, // 8 giờ
            allowTeamwork: op.difficulty >= 3,
            maxWorkers: op.difficulty >= 3 ? 3 : 1,
            active: true,
          });
          allOperations.push(operation);
          opIndex++;
        }
      }
    }
    console.log(`✅ Created ${allOperations.length} operations`);

    // ========== 5. PRODUCTION STANDARDS ==========
    console.log("\n📊 Creating Production Standards...");
    const standards: any[] = [];

    for (const op of allOperations) {
      const process = allProcesses.find(
        (p) => p._id.toString() === op.processId.toString(),
      );
      if (!process) continue;

      const standard = await ProductionStandard.create({
        vehicleTypeId: process.vehicleTypeId,
        operationId: op._id,
        expectedQuantity: op.standardQuantity,
        bonusPerUnit: 5000, // 5k bonus/unit vượt
        penaltyPerUnit: 3000, // 3k phạt/unit thiếu
        description: `Định mức cho ${op.name}`,
      });
      standards.push(standard);
    }
    console.log(`✅ Created ${standards.length} production standards`);

    // ========== 6. PRODUCTION ORDERS ==========
    console.log("\n📦 Creating Production Orders...");
    const admin = users.find((u) => u.role === "admin");

    const productionOrders = await ProductionOrder.create([
      {
        orderCode: "LSX-2026-001",
        vehicleTypeId: vehicleTypes[0]._id, // M1 Sport
        quantity: 100,
        frameNumbers: Array.from(
          { length: 100 },
          (_, i) => `M1SPORT-F-${String(i + 1).padStart(4, "0")}`,
        ),
        engineNumbers: Array.from(
          { length: 100 },
          (_, i) => `M1SPORT-E-${String(i + 1).padStart(4, "0")}`,
        ),
        startDate: getDate(30),
        expectedEndDate: getDate(-30),
        status: "in_progress",
        createdBy: admin!._id,
        note: "Lô sản xuất M1 Sport tháng 1",
        processProgress: allProcesses
          .filter(
            (p) =>
              p.vehicleTypeId.toString() === vehicleTypes[0]._id.toString(),
          )
          .map((p) => ({
            processId: p._id,
            processName: p.name,
            requiredQuantity: 100,
            completedQuantity: Math.floor(Math.random() * 50) + 30,
            status: "in_progress" as const,
          })),
      },
      {
        orderCode: "LSX-2026-002",
        vehicleTypeId: vehicleTypes[1]._id, // Bee U AI
        quantity: 50,
        frameNumbers: Array.from(
          { length: 50 },
          (_, i) => `BEEUAI-F-${String(i + 1).padStart(4, "0")}`,
        ),
        engineNumbers: Array.from(
          { length: 50 },
          (_, i) => `BEEUAI-E-${String(i + 1).padStart(4, "0")}`,
        ),
        startDate: getDate(20),
        expectedEndDate: getDate(-20),
        status: "in_progress",
        createdBy: admin!._id,
        note: "Lô sản xuất Bee U AI tháng 1",
        processProgress: allProcesses
          .filter(
            (p) =>
              p.vehicleTypeId.toString() === vehicleTypes[1]._id.toString(),
          )
          .map((p) => ({
            processId: p._id,
            processName: p.name,
            requiredQuantity: 50,
            completedQuantity: Math.floor(Math.random() * 25) + 10,
            status: "in_progress" as const,
          })),
      },
      {
        orderCode: "LSX-2026-003",
        vehicleTypeId: vehicleTypes[2]._id, // Camelo I8 AI
        quantity: 30,
        frameNumbers: Array.from(
          { length: 30 },
          (_, i) => `CAMELOI8-F-${String(i + 1).padStart(4, "0")}`,
        ),
        engineNumbers: Array.from(
          { length: 30 },
          (_, i) => `CAMELOI8-E-${String(i + 1).padStart(4, "0")}`,
        ),
        startDate: getDate(10),
        status: "pending",
        createdBy: admin!._id,
        note: "Lô sản xuất Camelo I8 AI tháng 2",
        processProgress: allProcesses
          .filter(
            (p) =>
              p.vehicleTypeId.toString() === vehicleTypes[2]._id.toString(),
          )
          .map((p) => ({
            processId: p._id,
            processName: p.name,
            requiredQuantity: 30,
            completedQuantity: 0,
            status: "pending" as const,
          })),
      },
    ]);
    console.log(`✅ Created ${productionOrders.length} production orders`);

    // ========== 7. SHIFTS & REGISTRATIONS (7 ngày gần nhất) ==========
    console.log("\n⏰ Creating Shifts & Registrations...");
    const workers = users.filter((u) => u.role === "worker");
    let shiftCount = 0;
    let regCount = 0;

    for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
      const shiftDate = getDate(daysAgo);

      for (const worker of workers) {
        // Tạo shift
        const shift = await Shift.create({
          userId: worker._id,
          date: shiftDate,
          startTime: shiftDate,
          endTime: new Date(shiftDate.getTime() + 8 * 60 * 60 * 1000), // +8 giờ
          totalWorkingMinutes: 480,
          status: daysAgo === 0 ? "active" : "completed",
        });
        shiftCount++;

        // Tạo 2-3 registrations cho mỗi shift
        const numRegs = Math.floor(Math.random() * 2) + 2;
        const availableOps = allOperations.slice(0, 20); // Lấy 20 operations đầu

        for (let i = 0; i < numRegs; i++) {
          const randomOp =
            availableOps[Math.floor(Math.random() * availableOps.length)];
          const process = allProcesses.find(
            (p) => p._id.toString() === randomOp.processId.toString(),
          );

          const actualQty = Math.floor(
            randomOp.standardQuantity * (0.8 + Math.random() * 0.4),
          );
          const deviation = actualQty - randomOp.standardQuantity;

          await DailyRegistration.create({
            userId: worker._id,
            shiftId: shift._id,
            date: shiftDate,
            productionOrderId: productionOrders[0]._id,
            operationId: randomOp._id,
            registeredAt: shiftDate,
            status: daysAgo === 0 ? "in_progress" : "completed",
            actualQuantity: daysAgo === 0 ? undefined : actualQty,
            expectedQuantity: randomOp.standardQuantity,
            deviation: daysAgo === 0 ? 0 : deviation,
            interruptionMinutes: Math.floor(Math.random() * 30),
            bonusAmount: deviation > 0 ? deviation * 5000 : 0,
            penaltyAmount: deviation < 0 ? Math.abs(deviation) * 3000 : 0,
            workingMinutes: Math.floor(480 / numRegs),
            checkInTime: new Date(shiftDate.getTime() + i * 150 * 60 * 1000),
            checkOutTime:
              daysAgo === 0
                ? undefined
                : new Date(shiftDate.getTime() + (i + 1) * 150 * 60 * 1000),
            isReplacement: false,
          });
          regCount++;
        }
      }
    }
    console.log(`✅ Created ${shiftCount} shifts`);
    console.log(`✅ Created ${regCount} registrations`);

    // ========== 8. DAILY REPORTS ==========
    console.log("\n📈 Creating Daily Reports...");
    let reportCount = 0;

    for (let daysAgo = 6; daysAgo >= 1; daysAgo--) {
      const reportDate = getDate(daysAgo);

      for (const worker of workers) {
        const shift = await Shift.findOne({
          userId: worker._id,
          date: reportDate,
        });
        if (!shift) continue;

        const regs = await DailyRegistration.find({
          shiftId: shift._id,
          status: "completed",
        });
        if (regs.length === 0) continue;

        const totalBonus = regs.reduce((sum, r) => sum + r.bonusAmount, 0);
        const totalPenalty = regs.reduce((sum, r) => sum + r.penaltyAmount, 0);
        const efficiency = 85 + Math.random() * 30; // 85-115%

        await DailyReport.create({
          userId: worker._id,
          shiftId: shift._id,
          date: reportDate,
          totalWorkingMinutes: 480,
          totalStandardMinutes: Math.floor(480 * (efficiency / 100)),
          totalOperations: regs.length,
          efficiencyPercent: Math.round(efficiency * 100) / 100,
          bonusAmount: totalBonus,
          penaltyAmount: totalPenalty,
          finalResult:
            totalBonus > totalPenalty
              ? "bonus"
              : totalPenalty > totalBonus
                ? "penalty"
                : "neutral",
        });
        reportCount++;
      }
    }
    console.log(`✅ Created ${reportCount} daily reports`);

    // ========== 9. SETTINGS ==========
    console.log("\n⚙️  Creating Settings...");
    await Settings.create([
      {
        key: "bonus_rules",
        value: {
          excellent: { minEfficiency: 120, bonusPercent: 15 },
          good: { minEfficiency: 100, bonusPercent: 10 },
          pass: { minEfficiency: 90, bonusPercent: 5 },
          warning: { minEfficiency: 80, bonusPercent: 0 },
          penalty: { minEfficiency: 0, penaltyPercent: 10 },
        },
        description: "Quy tắc tính thưởng/phạt theo hiệu suất",
      },
      {
        key: "working_hours",
        value: {
          shiftStart: "07:30",
          shiftEnd: "16:30",
          breakStart: "11:30",
          breakEnd: "13:00",
          totalMinutes: 480,
        },
        description: "Cấu hình giờ làm việc",
      },
      {
        key: "overtime_rate",
        value: {
          weekday: 1.5,
          weekend: 2.0,
          holiday: 3.0,
        },
        description: "Hệ số tính lương làm thêm giờ",
      },
      {
        key: "app_config",
        value: {
          companyName: "CÔNG TY CỔ PHẦN CÔNG NGHỆ XE ĐIỆN AI EBIKE",
          companyNameAlt: "CÔNG TY TNHH XE ĐIỆN BLUERA VIỆT NHẬT",
          defaultPassword: "123456",
          maxWorkersPerOperation: 5,
          autoCloseShiftHour: 22,
        },
        description: "Cấu hình chung của ứng dụng",
      },
    ]);
    console.log("✅ Created settings");

    // ========== SUMMARY ==========
    console.log("\n" + "=".repeat(50));
    console.log("🎉 SEED FULL DATA COMPLETED!");
    console.log("=".repeat(50));
    console.log("\n📊 Summary:");
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   🏍️  Vehicle Types: ${vehicleTypes.length}`);
    console.log(`   ⚙️  Processes: ${allProcesses.length}`);
    console.log(`   🔧 Operations: ${allOperations.length}`);
    console.log(`   📊 Production Standards: ${standards.length}`);
    console.log(`   📦 Production Orders: ${productionOrders.length}`);
    console.log(`   ⏰ Shifts: ${shiftCount}`);
    console.log(`   📝 Registrations: ${regCount}`);
    console.log(`   📈 Daily Reports: ${reportCount}`);

    console.log("\n🔑 Login credentials:");
    console.log("   Admin:      ADMIN / 123456");
    console.log("   Supervisor: GS001 / 123456");
    console.log("   Worker:     CN001 / 123456");

    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedFullData();
