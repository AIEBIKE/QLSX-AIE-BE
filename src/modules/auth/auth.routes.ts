/**
 * =============================================
 * AUTH ROUTES - Routes xác thực
 * =============================================
 * Định nghĩa các endpoints cho authentication
 */

import { Router } from "express";
import * as controller from "./auth.controller";
import * as accountController from "./account.controller";
import { auth, adminOnly, adminOrSupervisor } from "../../shared/middleware";
import { uploadAvatar } from "../../shared/middleware/upload.middleware";

const router = Router();

// ==================== PUBLIC ROUTES ====================
// Không cần đăng nhập

// Đăng nhập
router.post("/login", controller.login);

// Đăng ký (Disabled) // [minhlaoma-13/03-08:45]
// router.post("/register", controller.register);

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

// Upload avatar
router.post("/avatar", auth, uploadAvatar, controller.uploadAvatar);

// ==================== ADMIN ROUTES ====================
// Chỉ admin được truy cập

// Danh sách users
router.get("/users", auth, adminOrSupervisor, accountController.getAll);

// Users đang chờ duyệt (Dummy handler to prevent fall-through and CastError)
router.get("/users/pending", auth, adminOnly, controller.getPendingAccounts);

// Tổng hợp lương tất cả workers
router.get(
  "/users/salary-summary",
  auth,
  adminOnly,
  accountController.getAllWorkersSalary,
);

// Chi tiết user
router.get("/users/:id", auth, adminOrSupervisor, accountController.getById);

// Lịch sử làm việc của user
router.get(
  "/users/:id/work-history",
  auth,
  adminOrSupervisor,
  accountController.getWorkHistory,
);

// Duyệt tài khoản (Disabled) // [minhlaoma-13/03-08:45]
// router.put("/users/:id/approve", auth, adminOnly, accountController.approveUser);

// Từ chối tài khoản (Disabled) // [minhlaoma-13/03-08:45]
// router.put("/users/:id/reject", auth, adminOnly, accountController.rejectUser);

// Tạo user mới (admin/fac_manager tạo)
router.post("/users", auth, adminOrSupervisor, accountController.create);

// Cập nhật user
router.put("/users/:id", auth, adminOrSupervisor, accountController.update);

// Xóa user (soft delete)
router.delete("/users/:id", auth, adminOrSupervisor, accountController.remove);

export default router;
