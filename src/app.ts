/**
 * =============================================
 * APP.TS - Entry Point của Backend
 * =============================================
 * File khởi động chính của ứng dụng backend
 * Cấu hình: Express, CORS, Routes, Error handling
 *
 * CÔNG TY CỔ PHẦN CÔNG NGHỆ XE ĐIỆN AI EBIKE
 * CÔNG TY TNHH XE ĐIỆN BLUERA VIỆT NHẬT
 *
 * Hệ thống quản lý sản xuất và công nhân
 */

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/database";
import config from "./config/env";
import { errorHandler } from "./shared/middleware";

// ==================== IMPORT ROUTES ====================

// Auth: Đăng nhập, đăng xuất, thông tin user
import { authRoutes } from "./modules/auth";

// Vehicle Types: Quản lý loại xe (AIE MS1, M1 Sport...)
import { vehicleTypeRoutes } from "./modules/vehicleTypes";

// Processes: Quản lý công đoạn sản xuất
import { processRoutes } from "./modules/processes";

// Operations: Quản lý thao tác chi tiết
import { operationRoutes } from "./modules/operations";

// Production Standards: Định mức sản xuất
import { productionStandardRoutes } from "./modules/productionStandards";

// Production Orders: Lệnh sản xuất
import { productionOrderRoutes } from "./modules/productionOrders";

// Registrations: Đăng ký công việc hàng ngày
import { registrationRoutes } from "./modules/registrations";

// Shifts: Quản lý ca làm việc
import { shiftRoutes } from "./modules/shifts";

// Reports: Báo cáo hiệu suất, thưởng phạt
import { reportRoutes } from "./modules/reports";

// Factories: Quản lý nhà máy
import factoryRoutes from "./modules/factories/factory.routes";

// Quality Control: Kiểm soát chất lượng
import qcRoutes from "./modules/qc/qc.routes";

// Settings: Cấu hình hệ thống
import { settingsRoutes } from "./modules/settings";

// Worklogs: Nhật ký công việc
import { worklogRoutes } from "./modules/worklogs";

// ==================== KHỞI TẠO APP ====================

const app = express();

// Kết nối MongoDB
connectDB();

// ==================== MIDDLEWARE ====================

// Cho phép CORS (Cross-Origin Resource Sharing)
// Để frontend có thể gọi API từ domain khác
app.use(
  cors({
    origin: true, // Cho phép tất cả origins
    credentials: true, // Cho phép gửi cookies/auth headers
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Parse JSON body
app.use(express.json());

// Parse cookies
app.use(cookieParser());

// ==================== ĐĂNG KÝ ROUTES ====================

// Tất cả routes bắt đầu bằng /api
app.use("/api/auth", authRoutes); // Xác thực
app.use("/api/vehicle-types", vehicleTypeRoutes); // Loại xe
app.use("/api/processes", processRoutes); // Công đoạn
app.use("/api/operations", operationRoutes); // Thao tác
app.use("/api/production-standards", productionStandardRoutes); // Định mức
app.use("/api/production-orders", productionOrderRoutes); // Lệnh SX
app.use("/api/registrations", registrationRoutes); // Đăng ký công việc
app.use("/api/shifts", shiftRoutes); // Ca làm việc
app.use("/api/reports", reportRoutes); // Báo cáo
app.use("/api/factories", factoryRoutes); // Nhà máy
app.use("/api/qc", qcRoutes); // Kiểm tra chất lượng
app.use("/api/settings", settingsRoutes); // Cài đặt
app.use("/api/worklogs", worklogRoutes); // Nhật ký

// ==================== HEALTH CHECK ====================

/**
 * Endpoint kiểm tra server có hoạt động không
 * Dùng cho monitoring, load balancer
 */
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date(),
    architecture: "modular",
    language: "TypeScript",
  });
});

// ==================== ERROR HANDLER ====================

// Xử lý lỗi tập trung - phải đặt cuối cùng
app.use(errorHandler);

// ==================== KHỞI ĐỘNG SERVER ====================

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📦 Architecture: Modular TypeScript`);
  console.log(`🏭 AI EBIKE - BLUERA Production Management System`);
});

export default app;
