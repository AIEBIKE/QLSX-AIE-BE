/**
 * =============================================
 * AUTH CONTROLLER - Xác thực người dùng
 * =============================================
 * Xử lý: Đăng nhập, Đăng ký, Quên mật khẩu, Reset mật khẩu
 */

import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "./user.model";
import PasswordResetToken from "./passwordResetToken.model";
import config from "../../config/env";
import { sendPasswordResetEmail, sendWelcomeEmail } from "../../config/email";
import { AuthRequest } from "../../types";

// ==================== HELPER FUNCTIONS ====================

/**
 * Tự động tạo mã nhân viên tiếp theo
 * CN001, CN002... cho worker
 * GS001, GS002... cho supervisor
 * AD001, AD002... cho admin
 */
const generateNextCode = async (role: string): Promise<string> => {
  const prefixMap: Record<string, string> = {
    worker: "CN",
    supervisor: "GS",
    admin: "AD",
  };
  const prefix = prefixMap[role] || "CN";

  // Tìm mã lớn nhất hiện tại
  const regex = new RegExp(`^${prefix}(\\d+)$`);
  const users = await User.find({ code: regex }).select("code");

  let maxNum = 0;
  users.forEach((u) => {
    const match = u.code.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });

  // Tạo mã mới
  const nextNum = maxNum + 1;
  return `${prefix}${nextNum.toString().padStart(3, "0")}`;
};

/**
 * API endpoint để lấy mã tiếp theo (public)
 */
export const getNextCode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const role = req.params.role as string;
    const validRoles = ["worker", "supervisor", "admin"];

    if (!validRoles.includes(role)) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_ROLE", message: "Vai trò không hợp lệ" },
      });
      return;
    }

    const nextCode = await generateNextCode(role);
    res.json({ success: true, data: { code: nextCode } });
  } catch (error) {
    next(error);
  }
};

// ==================== ĐĂNG NHẬP ====================

/**
 * POST /api/auth/login
 * Đăng nhập với mã nhân viên và mật khẩu
 */
export const login = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { code, password } = req.body;

    // Validate input
    if (!code || !password) {
      res.status(400).json({
        success: false,
        error: {
          code: "MISSING_FIELDS",
          message: "Vui lòng nhập mã và mật khẩu",
        },
      });
      return;
    }

    // Tìm user theo code
    const user = await User.findOne({ code }).select("+password");

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Mã nhân viên hoặc mật khẩu không đúng",
        },
      });
      return;
    }

    // Kiểm tra trạng thái active
    if (!user.active) {
      res.status(401).json({
        success: false,
        error: { code: "INACTIVE", message: "Tài khoản đã bị vô hiệu hóa" },
      });
      return;
    }

    // Kiểm tra trạng thái duyệt tài khoản
    if (user.status === "pending") {
      res.status(401).json({
        success: false,
        error: {
          code: "PENDING_APPROVAL",
          message:
            "Tài khoản đang chờ admin duyệt. Vui lòng liên hệ quản trị viên.",
        },
      });
      return;
    }

    if (user.status === "rejected") {
      res.status(401).json({
        success: false,
        error: {
          code: "REJECTED",
          message: "Tài khoản đã bị từ chối. Vui lòng liên hệ quản trị viên.",
        },
      });
      return;
    }

    // So sánh mật khẩu
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Mã nhân viên hoặc mật khẩu không đúng",
        },
      });
      return;
    }

    // Tạo JWT token
    const expiresIn = config.jwtExpiresIn || "7d";
    const token = jwt.sign({ id: user._id.toString() }, config.jwtSecret, {
      expiresIn,
    } as jwt.SignOptions);

    // Trả về response
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          code: user.code,
          email: user.email,
          role: user.role,
          department: user.department,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==================== ĐĂNG KÝ ====================

/**
 * POST /api/auth/register
 * Đăng ký tài khoản mới (role: worker)
 */
export const register = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, code, email, password, department, role } = req.body;

    // Validate input
    if (!name || !password) {
      res.status(400).json({
        success: false,
        error: {
          code: "MISSING_FIELDS",
          message: "Vui lòng nhập đầy đủ thông tin: tên, mật khẩu",
        },
      });
      return;
    }

    // Kiểm tra mật khẩu tối thiểu 6 ký tự
    if (password.length < 6) {
      res.status(400).json({
        success: false,
        error: {
          code: "WEAK_PASSWORD",
          message: "Mật khẩu phải có ít nhất 6 ký tự",
        },
      });
      return;
    }

    // Validate role
    const validRoles = ["worker", "supervisor", "admin"];
    const selectedRole = role && validRoles.includes(role) ? role : "worker";

    // Nếu không truyền code, tự động tạo mã
    let employeeCode = code;
    if (!employeeCode) {
      employeeCode = await generateNextCode(selectedRole);
    } else {
      // Kiểm tra code đã tồn tại
      const existingUser = await User.findOne({ code: employeeCode });
      if (existingUser) {
        res.status(400).json({
          success: false,
          error: {
            code: "CODE_EXISTS",
            message: "Mã nhân viên đã tồn tại trong hệ thống",
          },
        });
        return;
      }
    }

    // Kiểm tra email đã tồn tại (nếu có)
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        res.status(400).json({
          success: false,
          error: {
            code: "EMAIL_EXISTS",
            message: "Email đã được sử dụng",
          },
        });
        return;
      }
    }

    // Tạo user mới với status = pending (chờ duyệt)
    const user = await User.create({
      name,
      code: employeeCode,
      email,
      password,
      department: department || "",
      role: selectedRole,
      active: true,
      status: "pending", // Chờ admin duyệt
    });

    // Gửi email thông báo (nếu có email)
    if (email) {
      await sendWelcomeEmail(email, name, employeeCode);
    }

    // Không tạo token - user cần được admin duyệt trước
    res.status(201).json({
      success: true,
      message: "Đăng ký thành công! Tài khoản của bạn đang chờ admin duyệt.",
      data: {
        user: {
          id: user._id,
          name: user.name,
          code: user.code,
          email: user.email,
          role: user.role,
          department: user.department,
          status: user.status,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==================== QUÊN MẬT KHẨU ====================

/**
 * POST /api/auth/forgot-password
 * Gửi email reset mật khẩu
 */
export const forgotPassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        error: {
          code: "MISSING_EMAIL",
          message: "Vui lòng nhập email",
        },
      });
      return;
    }

    // Tìm user theo email
    const user = await User.findOne({ email });

    // Luôn trả về success để không lộ thông tin user tồn tại
    if (!user) {
      res.json({
        success: true,
        message:
          "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được email hướng dẫn đặt lại mật khẩu",
      });
      return;
    }

    // Tạo reset token
    const resetToken = await PasswordResetToken.createToken(user._id);

    // Gửi email
    const emailSent = await sendPasswordResetEmail(
      email,
      resetToken,
      user.name,
    );

    if (!emailSent) {
      console.error("Failed to send password reset email");
    }

    res.json({
      success: true,
      message:
        "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được email hướng dẫn đặt lại mật khẩu",
    });
  } catch (error) {
    next(error);
  }
};

// ==================== ĐẶT LẠI MẬT KHẨU ====================

/**
 * POST /api/auth/reset-password
 * Đặt lại mật khẩu với token
 */
export const resetPassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).json({
        success: false,
        error: {
          code: "MISSING_FIELDS",
          message: "Vui lòng nhập token và mật khẩu mới",
        },
      });
      return;
    }

    // Kiểm tra mật khẩu
    if (password.length < 6) {
      res.status(400).json({
        success: false,
        error: {
          code: "WEAK_PASSWORD",
          message: "Mật khẩu phải có ít nhất 6 ký tự",
        },
      });
      return;
    }

    // Xác minh token
    const tokenDoc = await PasswordResetToken.verifyToken(token);

    if (!tokenDoc) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Token không hợp lệ hoặc đã hết hạn",
        },
      });
      return;
    }

    // Tìm user
    const user = await User.findById(tokenDoc.userId).select("+password");

    if (!user) {
      res.status(400).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "Không tìm thấy người dùng",
        },
      });
      return;
    }

    // Cập nhật mật khẩu
    user.password = password;
    await user.save();

    // Đánh dấu token đã sử dụng
    tokenDoc.used = true;
    await tokenDoc.save();

    res.json({
      success: true,
      message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.",
    });
  } catch (error) {
    next(error);
  }
};

// ==================== LẤY THÔNG TIN USER ====================

/**
 * GET /api/auth/me
 * Lấy thông tin user đang đăng nhập
 */
export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "User không tồn tại" },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        code: user.code,
        email: user.email,
        role: user.role,
        department: user.department,
        active: user.active,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==================== ĐĂNG XUẤT ====================

/**
 * POST /api/auth/logout
 * Đăng xuất (xóa token phía client)
 */
export const logout = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  res.json({
    success: true,
    message: "Đăng xuất thành công",
  });
};

// ==================== CẬP NHẬT THÔNG TIN CÁ NHÂN ====================

/**
 * PUT /api/auth/profile
 * User tự cập nhật thông tin cá nhân (name, email, department)
 */
export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { name, email, department } = req.body;

    if (!name || name.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: { code: "MISSING_NAME", message: "Tên không được để trống" },
      });
      return;
    }

    // Kiểm tra email trùng (nếu có thay đổi)
    if (email) {
      const existingEmail = await User.findOne({
        email,
        _id: { $ne: userId },
      });
      if (existingEmail) {
        res.status(400).json({
          success: false,
          error: { code: "EMAIL_EXISTS", message: "Email đã được sử dụng" },
        });
        return;
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        name: name.trim(),
        email: email?.trim() || "",
        department: department?.trim() || "",
      },
      { new: true },
    );

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "User không tồn tại" },
      });
      return;
    }

    res.json({
      success: true,
      message: "Cập nhật thông tin thành công",
      data: {
        id: user._id,
        name: user.name,
        code: user.code,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==================== ĐỔI MẬT KHẨU ====================

/**
 * PUT /api/auth/change-password
 * Đổi mật khẩu (cần nhập mật khẩu cũ)
 */
export const changePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: {
          code: "MISSING_FIELDS",
          message: "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới",
        },
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: {
          code: "WEAK_PASSWORD",
          message: "Mật khẩu mới phải có ít nhất 6 ký tự",
        },
      });
      return;
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "User không tồn tại" },
      });
      return;
    }

    // Kiểm tra mật khẩu cũ
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(400).json({
        success: false,
        error: {
          code: "WRONG_PASSWORD",
          message: "Mật khẩu hiện tại không đúng",
        },
      });
      return;
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Đổi mật khẩu thành công",
    });
  } catch (error) {
    next(error);
  }
};
