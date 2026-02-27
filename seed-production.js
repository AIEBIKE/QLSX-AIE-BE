const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://172.17.0.1:27017/qlsx";

// Define schemas inline
const userSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "supervisor", "worker"],
      default: "worker",
    },
    department: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const processSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    order: { type: Number, required: true },
    description: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const operationSchema = new mongoose.Schema(
  {
    processId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Process",
      required: true,
    },
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    standardTime: { type: Number, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: mongoose.Schema.Types.Mixed,
    description: String,
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);
const Process = mongoose.model("Process", processSchema);
const Operation = mongoose.model("Operation", operationSchema);
const Settings = mongoose.model("Settings", settingsSchema);

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB:", MONGODB_URI);

    // Clear existing data
    await User.deleteMany({});
    await Process.deleteMany({});
    await Operation.deleteMany({});
    await Settings.deleteMany({});
    console.log("Cleared existing data");

    // Hash password
    const hashedPassword = await bcrypt.hash("123456", 10);

    // Seed Users
    const users = await User.create([
      {
        code: "ADMIN",
        name: "Administrator",
        password: hashedPassword,
        role: "admin",
        active: true,
      },
      {
        code: "CN001",
        name: "Nguyễn Văn A",
        password: hashedPassword,
        role: "worker",
        department: "Sản xuất",
        active: true,
      },
      {
        code: "CN002",
        name: "Trần Thị B",
        password: hashedPassword,
        role: "worker",
        department: "Sản xuất",
        active: true,
      },
      {
        code: "CN003",
        name: "Lê Văn C",
        password: hashedPassword,
        role: "worker",
        department: "Sản xuất",
        active: true,
      },
      {
        code: "GS001",
        name: "Phạm Văn D",
        password: hashedPassword,
        role: "supervisor",
        department: "Sản xuất",
        active: true,
      },
    ]);
    console.log("✅ Created users:", users.length);

    // Seed Processes
    const processes = await Process.create([
      {
        name: "Công đoạn 1 - Chuẩn bị",
        code: "CD01",
        order: 1,
        description: "Chuẩn bị vật liệu",
      },
      {
        name: "Công đoạn 2 - Lắp ráp khung",
        code: "CD02",
        order: 2,
        description: "Lắp ráp khung chính",
      },
      {
        name: "Công đoạn 3 - Lắp động cơ",
        code: "CD03",
        order: 3,
        description: "Lắp động cơ và hệ thống",
      },
      {
        name: "Công đoạn 4 - Hệ thống điện",
        code: "CD04",
        order: 4,
        description: "Đấu nối hệ thống điện",
      },
      {
        name: "Công đoạn 5 - Hệ thống phanh",
        code: "CD05",
        order: 5,
        description: "Lắp hệ thống phanh",
      },
      {
        name: "Công đoạn 6 - Hoàn thiện ngoại thất",
        code: "CD06",
        order: 6,
        description: "Lắp các chi tiết ngoại thất",
      },
      {
        name: "Công đoạn 7 - Hoàn thiện nội thất",
        code: "CD07",
        order: 7,
        description: "Lắp nội thất",
      },
      {
        name: "Công đoạn 8 - Kiểm tra tổng thể",
        code: "CD08",
        order: 8,
        description: "Kiểm tra chất lượng",
      },
      {
        name: "Công đoạn 9 - Chạy thử",
        code: "CD09",
        order: 9,
        description: "Chạy thử trên đường thử",
      },
      {
        name: "Công đoạn 10 - Hoàn thiện cuối",
        code: "CD10",
        order: 10,
        description: "Hoàn thiện và đóng gói",
      },
    ]);
    console.log("✅ Created processes:", processes.length);

    // Seed Operations
    const operations = await Operation.create([
      {
        processId: processes[0]._id,
        name: "Kiểm tra vật liệu",
        code: "TT0101",
        standardTime: 10,
      },
      {
        processId: processes[0]._id,
        name: "Chuẩn bị dụng cụ",
        code: "TT0102",
        standardTime: 15,
      },
      {
        processId: processes[1]._id,
        name: "Lắp khung chính",
        code: "TT0201",
        standardTime: 30,
      },
      {
        processId: processes[1]._id,
        name: "Hàn khung",
        code: "TT0202",
        standardTime: 25,
      },
      {
        processId: processes[2]._id,
        name: "Lắp động cơ",
        code: "TT0301",
        standardTime: 45,
      },
      {
        processId: processes[2]._id,
        name: "Kết nối hệ thống truyền động",
        code: "TT0302",
        standardTime: 35,
      },
      {
        processId: processes[3]._id,
        name: "Đấu nối dây điện",
        code: "TT0401",
        standardTime: 40,
      },
      {
        processId: processes[3]._id,
        name: "Lắp đèn",
        code: "TT0402",
        standardTime: 20,
      },
      {
        processId: processes[4]._id,
        name: "Lắp phanh trước",
        code: "TT0501",
        standardTime: 25,
      },
      {
        processId: processes[4]._id,
        name: "Lắp phanh sau",
        code: "TT0502",
        standardTime: 25,
      },
      {
        processId: processes[5]._id,
        name: "Lắp vỏ xe",
        code: "TT0601",
        standardTime: 35,
      },
      {
        processId: processes[5]._id,
        name: "Lắp gương",
        code: "TT0602",
        standardTime: 15,
      },
      {
        processId: processes[6]._id,
        name: "Lắp yên xe",
        code: "TT0701",
        standardTime: 20,
      },
      {
        processId: processes[6]._id,
        name: "Lắp tay lái",
        code: "TT0702",
        standardTime: 15,
      },
      {
        processId: processes[7]._id,
        name: "Kiểm tra hệ thống điện",
        code: "TT0801",
        standardTime: 20,
      },
      {
        processId: processes[7]._id,
        name: "Kiểm tra phanh",
        code: "TT0802",
        standardTime: 15,
      },
      {
        processId: processes[8]._id,
        name: "Chạy thử tốc độ",
        code: "TT0901",
        standardTime: 30,
      },
      {
        processId: processes[8]._id,
        name: "Kiểm tra vận hành",
        code: "TT0902",
        standardTime: 25,
      },
      {
        processId: processes[9]._id,
        name: "Vệ sinh xe",
        code: "TT1001",
        standardTime: 20,
      },
      {
        processId: processes[9]._id,
        name: "Đóng gói",
        code: "TT1002",
        standardTime: 15,
      },
    ]);
    console.log("✅ Created operations:", operations.length);

    // Seed Settings
    await Settings.create({
      key: "bonus_rules",
      value: {
        levels: [
          {
            minPerformance: 0,
            maxPerformance: 50,
            bonusPercent: -10,
            label: "Kém",
          },
          {
            minPerformance: 50,
            maxPerformance: 80,
            bonusPercent: 0,
            label: "Trung bình",
          },
          {
            minPerformance: 80,
            maxPerformance: 100,
            bonusPercent: 5,
            label: "Khá",
          },
          {
            minPerformance: 100,
            maxPerformance: 120,
            bonusPercent: 10,
            label: "Tốt",
          },
          {
            minPerformance: 120,
            maxPerformance: 999,
            bonusPercent: 15,
            label: "Xuất sắc",
          },
        ],
      },
      description: "Công thức tính thưởng/phạt dựa trên hiệu suất",
    });
    console.log("✅ Created settings");

    console.log("\n🎉 Seed data completed!");
    console.log("\n📝 Login credentials:");
    console.log("   Admin: ADMIN / 123456");
    console.log("   Worker: CN001 / 123456");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
};

seedData();
