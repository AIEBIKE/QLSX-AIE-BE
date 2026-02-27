/**
 * =============================================
 * SHARED MIDDLEWARE - Export Middleware chung
 * =============================================
 * Tập trung export tất cả middleware dùng chung
 */

// ==================== AUTH MIDDLEWARE ====================
// Các middleware xác thực và phân quyền

export {
  auth, // Xác thực JWT token
  adminOnly, // Chỉ admin được truy cập
  adminOrSupervisor, // Admin hoặc giám sát
  authorize, // Phân quyền theo role
} from "./auth.middleware";

// ==================== ERROR MIDDLEWARE ====================
// Xử lý lỗi tập trung

export {
  errorHandler, // Xử lý và format lỗi
} from "./error.middleware";
