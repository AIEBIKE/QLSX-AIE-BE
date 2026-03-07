/**
 * =============================================
 * AUTH CONTROLLER - Xác thực người dùng
 * =============================================
 * Xử lý: Đăng nhập, Đăng ký, Quên mật khẩu, Reset mật khẩu
 */

import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Account from "./account.model";
import Admin from "../admins/admin.model";
import Supervisor from "../supervisors/supervisor.model";
import FactoryManager from "../facManagers/facManager.model";
import Worker from "../workers/worker.model";
import Factory from "../factories/factory.model";
import Role from "../roles/role.model";
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
    WORKER: "CN",
    FAC_MANAGER: "QL", // Changed from GS to QL for Factory Manager
    SUPERVISOR: "GS",
    ADMIN: "AD",
    worker: "CN",
    supervisor: "GS",
    admin: "AD",
    fac_manager: "QL", // Added for consistency
  };
  const prefix = prefixMap[role] || "CN";

  // Tìm mã lớn nhất hiện tại trong bảng Account
  const regex = new RegExp(`^${prefix}(\\d+)$`);
  const accounts = await Account.find({ code: regex }).select("code");

  let maxNum = 0;
  accounts.forEach((acc) => {
    const match = acc.code.match(regex);
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
    const validRoles = ["worker", "supervisor", "admin", "fac_manager"]; // Added fac_manager

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

    // Tìm account theo code
    const account = await Account.findOne({ code })
      .select("+password")
      .populate("roleId")
      .populate("profileId");

    if (!account) {
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
    if (!account.active) {
      res.status(401).json({
        success: false,
        error: { code: "INACTIVE", message: "Tài khoản đã bị vô hiệu hóa" },
      });
      return;
    }

    // Kiểm tra trạng thái duyệt tài khoản
    if (account.status === "pending") {
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

    if (account.status === "rejected") {
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
    const isMatch = await account.comparePassword(password);

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
    const token = jwt.sign({ id: account._id.toString() }, config.jwtSecret, {
      expiresIn,
    } as jwt.SignOptions);

    const profile = account.profileId as any;

    let factory = null;
    const factoryId = profile?.factoryId || profile?.factory_belong_to;
    if (factoryId) {
      factory = await Factory.findById(factoryId).select("name code");
    }

    // Thiết lập Cookies
    res.cookie("token", token, {
      httpOnly: true, // Không thể truy cập qua JavaScript (chống XSS)
      secure: process.env.NODE_ENV === "production", // Chỉ gửi qua HTTPS ở môi trường production
      sameSite: "lax", // Bảo vệ CSRF
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const userData = {
      id: account._id,
      name: profile?.name,
      code: account.code,
      email: account.email,
      roleId: account.roleId,
      roleCode: (account.roleId as any)?.code,
      profile: profile,
      factory: factory,
    };

    res.cookie("user", JSON.stringify(userData), {
      httpOnly: false, // Frontend cần đọc thông tin user
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Trả về response
    res.json({
      success: true,
      data: {
        token, // Vẫn trả về token ở body để tương thích tạm thời nếu cần
        user: userData,
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
    const { name, code, email, password, role } = req.body;

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
    const roles = await Role.find();
    let selectedRoleId = roles.find(r => r.code === "WORKER")?._id;
    let selectedRoleCode = "WORKER";

    if (role) {
      const foundRole = roles.find(r => r.code === role || r.code.toLowerCase() === role.toLowerCase());
      if (foundRole) {
        selectedRoleId = foundRole._id;
        selectedRoleCode = foundRole.code;
      }
    }

    // Nếu không truyền code, tự động tạo mã
    let employeeCode = code;
    if (!employeeCode) {
      employeeCode = await generateNextCode(selectedRoleCode);
    } else {
      // Kiểm tra code đã tồn tại
      const existingAccount = await Account.findOne({ code: employeeCode });
      if (existingAccount) {
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
      const existingEmail = await Account.findOne({ email });
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

    // Xác định profile model
    let profileModel: "Admin" | "Supervisor" | "Worker" | "FactoryManager" = "Worker";
    let ModelToUse: any = Worker;
    const profileData: any = { name };

    const roleCode = selectedRoleCode.toUpperCase();
    if (roleCode === "ADMIN") {
      profileModel = "Admin";
      ModelToUse = Admin;
    } else if (roleCode === "SUPERVISOR") {
      profileModel = "Supervisor";
      ModelToUse = Supervisor;
    } else if (roleCode === "FAC_MANAGER") {
      profileModel = "FactoryManager";
      ModelToUse = FactoryManager;
    }

    // Tạo profile mới
    const profile = await ModelToUse.create(profileData);

    // Tạo account mới với status = pending (chờ duyệt)
    const account = await Account.create({
      code: employeeCode,
      email,
      password,
      roleId: selectedRoleId,
      profileId: profile._id,
      profileModel: profileModel,
      active: true,
      status: "pending", // Chờ admin duyệt
    });

    // Cập nhật accountId cho profile
    profile.accountId = account._id;
    await profile.save();

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
          id: account._id,
          name: profile.name,
          code: account.code,
          email: account.email,
          roleId: account.roleId,
          status: account.status,
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

    // Tìm account theo email
    const account = await Account.findOne({ email });

    // Luôn trả về success để không lộ thông tin user tồn tại
    if (!account) {
      res.json({
        success: true,
        message:
          "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được email hướng dẫn đặt lại mật khẩu",
      });
      return;
    }

    // Tạo reset token
    const resetToken = await PasswordResetToken.createToken(account._id);

    // Lấy thông tin profile để lấy tên
    const profileCollection = account.profileModel.toLowerCase() + "s";
    const profile = await mongoose.connection.db.collection(profileCollection).findOne({ _id: account.profileId });

    // Gửi email
    const emailSent = await sendPasswordResetEmail(
      email,
      resetToken,
      profile?.name || account.code,
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

    // Tìm account
    const account = await Account.findById(tokenDoc.userId).select("+password");

    if (!account) {
      res.status(400).json({
        success: false,
        error: {
          code: "ACCOUNT_NOT_FOUND",
          message: "Không tìm thấy tài khoản",
        },
      });
      return;
    }

    // Cập nhật mật khẩu
    account.password = password;
    await account.save();

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
    const account = await Account.findById(req.user?._id).populate("roleId").populate("profileId");

    if (!account) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Tài khoản không tồn tại" },
      });
      return;
    }

    const profile = account.profileId as any;
    let factory = null;

    // Fetch factory name if user belongs to one
    const factoryId = profile?.factoryId || profile?.factory_belong_to;
    if (factoryId) {
      factory = await Factory.findById(factoryId).select("name code");
    }

    res.json({
      success: true,
      data: {
        id: account._id,
        name: profile?.name,
        code: account.code,
        email: account.email,
        roleId: account.roleId,
        roleCode: (account.roleId as any)?.code,
        profile: profile,
        factory: factory,
        active: account.active,
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
  // Clear Cookies
  res.clearCookie("token");
  res.clearCookie("user");

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
    const { name, email, dateOfBirth, citizenId, address, factory_belong_to, factoryId } = req.body;

    if (!name || name.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: { code: "MISSING_NAME", message: "Tên không được để trống" },
      });
      return;
    }

    // Kiểm tra email trùng (nếu có thay đổi)
    if (email) {
      const existingEmail = await Account.findOne({
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

    // 1. Cập nhật Account (email)
    const account = await Account.findByIdAndUpdate(
      userId,
      { email: email?.trim() || "" },
      { new: true }
    ).populate("roleId");

    if (!account) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Tài khoản không tồn tại" },
      });
      return;
    }

    // 2. Cập nhật Profile tương ứng
    const profileModel = account.profileModel;
    let ProfileModelToUse: any;
    let updateData: any = {
      name: name.trim(),
      dateOfBirth,
      citizenId,
      address
    };

    if (profileModel === "Admin") {
      ProfileModelToUse = Admin;
    } else if (profileModel === "FactoryManager") {
      ProfileModelToUse = FactoryManager;
      if (factory_belong_to !== undefined) updateData.factory_belong_to = factory_belong_to;
    } else if (profileModel === "Supervisor") {
      ProfileModelToUse = Supervisor;
      if (factory_belong_to !== undefined) updateData.factory_belong_to = factory_belong_to;
    } else {
      ProfileModelToUse = Worker;
      if (factoryId !== undefined) updateData.factoryId = factoryId;
    }

    const profile = await ProfileModelToUse.findOneAndUpdate(
      { accountId: userId },
      updateData,
      { new: true }
    );

    res.json({
      success: true,
      message: "Cập nhật thông tin thành công",
      data: {
        id: account._id,
        name: profile?.name,
        code: account.code,
        email: account.email,
        roleId: account.roleId,
        roleCode: (account.roleId as any)?.code,
        profile: profile,
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

    const account = await Account.findById(userId).select("+password");
    if (!account) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Tài khoản không tồn tại" },
      });
      return;
    }

    // Kiểm tra mật khẩu cũ
    const isMatch = await account.comparePassword(currentPassword);
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

    account.password = newPassword;
    await account.save();

    res.json({
      success: true,
      message: "Đổi mật khẩu thành công",
    });
  } catch (error) {
    next(error);
  }
};
