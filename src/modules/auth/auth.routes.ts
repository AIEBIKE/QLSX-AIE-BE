/**
 * =============================================
 * AUTH ROUTES - Routes xác thực
 * =============================================
 * Định nghĩa các endpoints cho authentication
 */

import { Router } from "express";
import * as controller from "./auth.controller";
import * as userController from "./user.controller";
import { auth, adminOnly } from "../../shared/middleware";

const router = Router();

// ==================== PUBLIC ROUTES ====================
// Không cần đăng nhập

// Đăng nhập
router.post("/login", controller.login);

// Đăng ký (tự đăng ký, chọn role, chờ duyệt)
router.post("/register", controller.register);

// Lấy mã nhân viên tiếp theo (theo role)
router.get("/next-code/:role", controller.getNextCode);

// Quên mật khẩu - gửi email reset
router.post("/forgot-password", controller.forgotPassword);

// Đặt lại mật khẩu với token
router.post("/reset-password", controller.resetPassword);

// ==================== PROTECTED ROUTES ====================
// Cần đăng nhập

// Lấy thông tin user đang đăng nhập
router.get("/me", auth, controller.getMe);

// Đăng xuất
router.post("/logout", auth, controller.logout);

// Cập nhật thông tin cá nhân
router.put("/profile", auth, controller.updateProfile);

// Đổi mật khẩu
router.put("/change-password", auth, controller.changePassword);

// ==================== ADMIN ROUTES ====================
// Chỉ admin được truy cập

// Danh sách users
router.get("/users", auth, adminOnly, userController.getAll);

// Users đang chờ duyệt
router.get("/users/pending", auth, adminOnly, userController.getPendingUsers);

// Tổng hợp lương tất cả workers
router.get(
  "/users/salary-summary",
  auth,
  adminOnly,
  userController.getAllWorkersSalary,
);

// Chi tiết user
router.get("/users/:id", auth, adminOnly, userController.getById);

// Lịch sử làm việc của user
router.get(
  "/users/:id/work-history",
  auth,
  adminOnly,
  userController.getWorkHistory,
);

// Duyệt tài khoản
router.put("/users/:id/approve", auth, adminOnly, userController.approveUser);

// Từ chối tài khoản
router.put("/users/:id/reject", auth, adminOnly, userController.rejectUser);

// Tạo user mới (admin tạo)
router.post("/users", auth, adminOnly, userController.create);

// Cập nhật user
router.put("/users/:id", auth, adminOnly, userController.update);

// Xóa user (soft delete)
router.delete("/users/:id", auth, adminOnly, userController.remove);

export default router;
