/**
 * SEED AIE MS1 - Thêm dữ liệu xe điện AIE MS1 với đầy đủ công đoạn
 * Chạy: npm run seed:aiems1
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

import VehicleType from "./src/modules/vehicleTypes/vehicleType.model";
import Process from "./src/modules/processes/process.model";
import Operation from "./src/modules/operations/operation.model";
import ProductionStandard from "./src/modules/productionStandards/productionStandard.model";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/qlsx";

const seedAIEMS1 = async () => {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // ========== 1. TẠO LOẠI XE AIE MS1 ==========
    console.log("\n🛵 Creating Vehicle Type AIE MS1...");

    // Kiểm tra nếu đã tồn tại
    let aieMS1 = await VehicleType.findOne({ code: "AIEMS1" });
    if (aieMS1) {
      console.log("⚠️  AIE MS1 đã tồn tại, đang xóa dữ liệu cũ...");
      // Xóa operations và processes cũ
      const oldProcesses = await Process.find({ vehicleTypeId: aieMS1._id });
      for (const proc of oldProcesses) {
        await Operation.deleteMany({ processId: proc._id });
      }
      await Process.deleteMany({ vehicleTypeId: aieMS1._id });
      await ProductionStandard.deleteMany({ vehicleTypeId: aieMS1._id });
    } else {
      aieMS1 = await VehicleType.create({
        code: "AIEMS1",
        name: "AIE MS1",
        description: "Xe điện AIE MS1 - Xe máy điện thời trang",
        active: true,
      });
    }
    console.log(`✅ Vehicle Type: ${aieMS1.name}`);

    // ========== 2. TẠO CÁC CÔNG ĐOẠN ==========
    console.log("\n⚙️  Creating Processes for AIE MS1...");

    const processData = [
      {
        code: "CD01",
        name: "Lắp khung & chân chống",
        order: 1,
        description: "Lắp ráp khung xe và chân chống",
      },
      {
        code: "CD02",
        name: "Lắp hệ thống giảm xóc",
        order: 2,
        description: "Lắp giảm xóc và bánh xe",
      },
      {
        code: "CD03",
        name: "Lắp động cơ điện",
        order: 3,
        description: "Lắp động cơ và dây điện động cơ",
      },
      {
        code: "CD04",
        name: "Lắp hệ thống lái",
        order: 4,
        description: "Lắp cổ lái, phuộc và tay lái",
      },
      {
        code: "CD05",
        name: "Lắp hệ thống điện",
        order: 5,
        description: "Đấu nối hệ thống điện",
      },
      {
        code: "CD06",
        name: "Lắp phanh & bánh xe",
        order: 6,
        description: "Lắp phanh đĩa và bánh xe",
      },
      {
        code: "CD07",
        name: "Lắp vỏ nhựa",
        order: 7,
        description: "Lắp các bộ phận vỏ nhựa",
      },
      {
        code: "CD08",
        name: "Lắp đèn & xi nhan",
        order: 8,
        description: "Lắp hệ thống chiếu sáng",
      },
      {
        code: "CD09",
        name: "Hoàn thiện & kiểm tra",
        order: 9,
        description: "Hoàn thiện và kiểm tra chất lượng",
      },
      {
        code: "CD10",
        name: "Chạy thử & xuất xưởng",
        order: 10,
        description: "Test và đóng gói",
      },
    ];

    const processes: any[] = [];
    for (const pd of processData) {
      const process = await Process.create({
        vehicleTypeId: aieMS1._id,
        code: `AIEMS1-${pd.code}`,
        name: pd.name,
        order: pd.order,
        description: pd.description,
        active: true,
      });
      processes.push(process);
    }
    console.log(`✅ Created ${processes.length} processes`);

    // ========== 3. TẠO CÁC THAO TÁC THEO PHIẾU KIỂM TRA ==========
    console.log("\n🔧 Creating Operations for AIE MS1...");

    // Dữ liệu thao tác theo phiếu kiểm tra công đoạn sản xuất AIE MS1
    const operationData = [
      // CÔNG ĐOẠN 1: Lắp khung & chân chống
      {
        processOrder: 1,
        operations: [
          {
            stt: 1,
            name: "Lắp chân cổ trên đoạn vào khung",
            standard: "Chụp không trầy xước, chắn cố vỉ khớp không lỏng lẻo",
            difficulty: 2,
          },
          {
            stt: 2,
            name: "Bắn ốc khung",
            standard:
              "Bắt khung vừ giữa, không đụng trừ vào, đây vào, đúng bẻ, cổ các lỗ lý trưng và daub và sẽ xẻ thông/theo đạt chuẩn",
            difficulty: 2,
          },
          {
            stt: 3,
            name: "Treo khung lên dây chuyền",
            standard: "Treo đúng vị trí, không làm gãy treo xẹn",
            difficulty: 1,
          },
          {
            stt: 4,
            name: "Lắp tấm giếm - chân giếm vào khung",
            standard: "Lắp vào đúc treo vào, không bị lỏng lẻo",
            difficulty: 2,
          },
          {
            stt: 5,
            name: "Lắp bộ phận trụ lái vào trục",
            standard: "Lắp vào đúc chấn chấn vào đúng vị trí",
            difficulty: 2,
          },
        ],
      },
      // CÔNG ĐOẠN 2: Lắp hệ thống giảm xóc
      {
        processOrder: 2,
        operations: [
          {
            stt: 6,
            name: "Lắp thành cổng - chấn chấp vào trục",
            standard: "Đừng chụng loại, đừng chấn, không lắp",
            difficulty: 2,
          },
          {
            stt: 7,
            name: "Lắp bộ giảm xóc trục + vào khung và xắng sau",
            standard: "Lắp vào xác, loại xác độ khung (44 - 47 Nm)",
            difficulty: 3,
          },
          {
            stt: 8,
            name: "Lắp cụm sàn trước vào khung",
            standard: "Lắp bằng chống đứng - lắp vào vệ sinh cổng sau",
            difficulty: 2,
          },
          {
            stt: 9,
            name: "Lắp chân chống đứng - lắp vào vệ cổng sau",
            standard: "Đứng vị xắc, chứng vì bấp lái trường để đứng",
            difficulty: 2,
          },
        ],
      },
      // CÔNG ĐOẠN 3: Lắp động cơ điện
      {
        processOrder: 3,
        operations: [
          {
            stt: 10,
            name: "Lắp cụm động cơ + lắp vào sàn khung",
            standard: "Đứng vị xắc chuẩn dây cơ chính, đứng",
            difficulty: 3,
          },
          {
            stt: 11,
            name: "Lắp cụm đông xe vào khung",
            standard: "Đứng chuẩn đứng lái vào chủ đúng chuẩn",
            difficulty: 3,
          },
          {
            stt: 12,
            name: "Lắp dây nắp xe động cơ - buýnh trước/sau",
            standard: "Chuẩn, chấn, loại xắt dộ khung (44 - 47 Nm)",
            difficulty: 2,
          },
          {
            stt: 13,
            name: "Cố định động xe vào khung",
            standard: "Đừng vỉ xẻ, chấn chấn đầu vị khung lạch",
            difficulty: 2,
          },
        ],
      },
      // CÔNG ĐOẠN 4: Lắp hệ thống lái
      {
        processOrder: 4,
        operations: [
          {
            stt: 14,
            name: "Đầu vạn phách đầu trước, bắc chốn bản trước",
            standard:
              "Đứng vỉ xắc đừng chuẩn loại lái lái chấn chấn, loại xắt đố khung (6 - 40 Nm)",
            difficulty: 3,
          },
          {
            stt: 15,
            name: "Lắp vòng bi chân cổ đoạn vào cốt lái",
            standard: "Đứng vỏ xẻ, chuẩn chấn, đầu vị khóa lạch",
            difficulty: 2,
          },
          {
            stt: 16,
            name: "Lắp bộ bị chân cổ trên vào cốt sắn bề",
            standard: "Đứng vỉ xệ, chúc chấn, đầu và khung lạch",
            difficulty: 2,
          },
          {
            stt: 17,
            name: "Lắp cốt peo lái trước - chắn bảm trước vào khung",
            standard: "Đứng vỉ xắc loại chấn chấn, loại xắt đố khung 15-25 Nm",
            difficulty: 3,
          },
          {
            stt: 18,
            name: "Lắp dải ốc mặt bê chấn vào cốt lái",
            standard:
              "Đứng vị xắc, đứng chuẩn loại lái lắp chấn chấn, lực xắt đố khống (6-40 Nm)",
            difficulty: 2,
          },
          {
            stt: 19,
            name: "Lắp dải ốc lắp khung bi chấn cổ",
            standard:
              "Đứng vỉ xắc loại và sau lái lái lắp chấn chấn, lực xắt đội khống 90 -97 Nm",
            difficulty: 2,
          },
        ],
      },
      // CÔNG ĐOẠN 5: Lắp hệ thống điện
      {
        processOrder: 5,
        operations: [
          {
            stt: 20,
            name: "Cắp xưởng bay lái vào cảm xưởng sát lái trước",
            standard: "Đứng vỉ xắc, đầu vỉ khung lạch",
            difficulty: 2,
          },
          {
            stt: 21,
            name: "Lắp dây điện đông - dây phanh - đầy lây sấu và sao khùng",
            standard: "Chầy chập ất giếng pháp, đánh, đầu và giếng bày xắc đèn",
            difficulty: 3,
          },
          {
            stt: 22,
            name: "Lắp dây điện đèn trước - dây phanh trước vào khung",
            standard: "Vỉ xắc đầu, chứng chấn chấn, chấn chấn",
            difficulty: 2,
          },
          {
            stt: 23,
            name: "Lắp cảm chiều hóa xao khung",
            standard: "Đừng chứng loại, giới chấn chấn",
            difficulty: 2,
          },
          {
            stt: 24,
            name: "Lắp dây điện chứng vào đủ phanh(trước,ay)",
            standard: "Đừng chứng loại, chấn chấn, Chuẩn ốc",
            difficulty: 2,
          },
        ],
      },
      // CÔNG ĐOẠN 6: Lắp phanh & bánh xe
      {
        processOrder: 6,
        operations: [
          {
            stt: 25,
            name: "Lắp giá phải với đó phanh(trước,say)",
            standard: "Chuẩn chính, đừng lại, chứng vắn",
            difficulty: 2,
          },
          {
            stt: 26,
            name: "Lắp bộ xạ nhựa trước vào lái đoạn",
            standard: "Chuẩn chấn, không lạch, đừng chứng lạch",
            difficulty: 2,
          },
          {
            stt: 27,
            name: "Lắp rum vỉ đội treo (cái lặp đứng loại caí lái đoạn đơi)",
            standard: "Chuẩn chấn, không lạch, đứng chứng loại",
            difficulty: 2,
          },
          {
            stt: 28,
            name: "Lắp cái nhối nành vào đừng rái pin",
            standard: "Lái xắt và đứng khung, cách đầu, axắc trước",
            difficulty: 2,
          },
          {
            stt: 29,
            name: "Lắp thì bộ xé nguồn / chép với động cảu đây đalay xống",
            standard: "Cái xắc chính, đứng vỉ lái vá treo cách đứng (à sợ đố)",
            difficulty: 3,
          },
        ],
      },
      // CÔNG ĐOẠN 7: Lắp vỏ nhựa
      {
        processOrder: 7,
        operations: [
          {
            stt: 30,
            name: "Lắp bộ đầu khung vào khung",
            standard: "Đầu loại chấn chấn, Cách vỉ xẻ cách chấn trượt đối",
            difficulty: 2,
          },
          {
            stt: 31,
            name: "Chính mát giáo điện cám cấm lái với điện loại(n)",
            standard:
              "Chuẩn chấn, khong lại, cách chứng loại(n), đầu xắc trước",
            difficulty: 2,
          },
          {
            stt: 32,
            name: "Lắp đây cổ viếng cổ rắn lái với điện hướng",
            standard: "Chầy chấn, khóng lạch, chứng lây rằng",
            difficulty: 2,
          },
          {
            stt: 33,
            name: "Kiển tra hoạt động hệ thống điện cấp điện nguạy (chuẩn 48 - 6 V)",
            standard: "Hoạt đứng đứng nguây đến, khúng lái",
            difficulty: 3,
          },
          {
            stt: 34,
            name: "Kết nối vẫn sạc - kiểm tra các chúng hoạt động của sạc",
            standard: "Chuẩn chấn, không lạch, không truy được",
            difficulty: 2,
          },
        ],
      },
      // CÔNG ĐOẠN 8: Lắp đèn & xi nhan
      {
        processOrder: 8,
        operations: [
          {
            stt: 35,
            name: "Lắp sạm mũi/vọng sấn lái phyô đìi cọ cắm đèn loại(f) và câm mũi/dáy vỉ cái",
            standard: "Chuẩn chấn, không trước, không lạch",
            difficulty: 2,
          },
          {
            stt: 36,
            name: "Lắp đèn xào khùng",
            standard: "Chuẩn chấn, chủng đây, khong xắc",
            difficulty: 2,
          },
          {
            stt: 37,
            name: "Lắp bộ vỏ nhựa cái trủ vào khùng",
            standard: "Chuẩn chấn, không lại, khùng vắt",
            difficulty: 2,
          },
          {
            stt: 38,
            name: "Lắp cái vỉ thể lái vào khùng",
            standard: "Chuẩn chấn, đừng loại, không vắt",
            difficulty: 2,
          },
          {
            stt: 39,
            name: "Lắp viễn nhan tụ hoại xào sau đế",
            standard: "Chuẩn chấn, đừng lại, khong vắt",
            difficulty: 2,
          },
        ],
      },
      // CÔNG ĐOẠN 9: Hoàn thiện & kiểm tra
      {
        processOrder: 9,
        operations: [
          {
            stt: 40,
            name: "Lắp thanh cành sau phía đại vào mầng sốt đoái mắt để xac cái mũng nới lái phía và cổ",
            standard: "Chuẩn chấn, không trước, khong lạch",
            difficulty: 2,
          },
          {
            stt: 41,
            name: "Lắp đầm vào khung",
            standard: "Chuẩn vỉ, đừng chứng, khùng bẻ lạch",
            difficulty: 2,
          },
          {
            stt: 42,
            name: "Lắp cái giáo khỉ của Dùng",
            standard: "Đừng chứng, đùng vì lạch, khùng vắt",
            difficulty: 2,
          },
          {
            stt: 43,
            name: "Lắp giá đại trụ phía vỉ chý đã",
            standard: "Chuẩn chấn, khùng lới, khùng vắt",
            difficulty: 2,
          },
          {
            stt: 44,
            name: "Lắp yên mũi hình lái vào khùng",
            standard: "Chuẩn chấn, khùng lời, khắng vắt",
            difficulty: 2,
          },
          {
            stt: 45,
            name: "Lắp tem cố và cổ khung",
            standard: "Chuẩn vẻ xắc, chịu chấn và khùng lạch",
            difficulty: 1,
          },
        ],
      },
      // CÔNG ĐOẠN 10: Chạy thử & xuất xưởng
      {
        processOrder: 10,
        operations: [
          {
            stt: 46,
            name: "Lắp vùng cao xập xạy",
            standard: "Chuẩn lần chấn, chứng vắt và khớp",
            difficulty: 2,
          },
          {
            stt: 47,
            name: "Lắp tay công xào phía",
            standard: "Chuẩn chấn, lưữa lạch, khùng vắt",
            difficulty: 2,
          },
          {
            stt: 48,
            name: "Chấn vành cổ số trên phía mỗi sau và tay cái của lái xe nhà cõng về khùng và",
            standard: "Đụng vỉ xắc, chất chấn cổ và khùng lạch",
            difficulty: 3,
          },
          {
            stt: 49,
            name: "Chạy thứ xe",
            standard: "Chuẩn vỉ, chấn chấn, đừng chứng",
            difficulty: 3,
          },
          {
            stt: 50,
            name: "Vệ sinh sau đổ chấn xào khung sỉ",
            standard: "Chuẩn chấn, đùng, chứng vải",
            difficulty: 1,
          },
          {
            stt: 51,
            name: "Dán tem treo đề",
            standard: "Chuẩn chấn, đừng, chứng vắt",
            difficulty: 1,
          },
        ],
      },
    ];

    const operations: any[] = [];

    for (const opGroup of operationData) {
      const process = processes.find((p) => p.order === opGroup.processOrder);
      if (!process) continue;

      for (const op of opGroup.operations) {
        const operation = await Operation.create({
          processId: process._id,
          code: `AIEMS1-TT${String(op.stt).padStart(2, "0")}`,
          name: op.name,
          difficulty: op.difficulty,
          standardQuantity: 30, // Định mức 30 xe/ca
          standardMinutes: Math.floor(480 / opGroup.operations.length), // Chia đều thời gian ca
          workingMinutesPerShift: 480,
          allowTeamwork: op.difficulty >= 3,
          maxWorkers: op.difficulty >= 3 ? 2 : 1,
          instructions: op.standard,
          description: op.standard,
          active: true,
        });
        operations.push(operation);
      }
    }
    console.log(`✅ Created ${operations.length} operations`);

    // ========== 4. TẠO PRODUCTION STANDARDS ==========
    console.log("\n📊 Creating Production Standards...");
    const standards: any[] = [];

    for (const op of operations) {
      const standard = await ProductionStandard.create({
        vehicleTypeId: aieMS1._id,
        operationId: op._id,
        expectedQuantity: op.standardQuantity,
        bonusPerUnit: 5000,
        penaltyPerUnit: 3000,
        description: `Định mức cho ${op.name}`,
      });
      standards.push(standard);
    }
    console.log(`✅ Created ${standards.length} production standards`);

    // ========== SUMMARY ==========
    console.log("\n" + "=".repeat(50));
    console.log("🎉 SEED AIE MS1 COMPLETED!");
    console.log("=".repeat(50));
    console.log("\n📊 Summary:");
    console.log(`   🛵 Vehicle Type: AIE MS1`);
    console.log(`   ⚙️  Processes: ${processes.length}`);
    console.log(`   🔧 Operations: ${operations.length}`);
    console.log(`   📊 Production Standards: ${standards.length}`);

    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedAIEMS1();
