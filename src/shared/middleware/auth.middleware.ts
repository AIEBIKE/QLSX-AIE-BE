import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../../config/env";
import { AuthRequest } from "../../types";
// Lazy load Account model to prevent circular dependencies
let Account: typeof import("../../modules/auth/account.model").default;

const getAccountModel = async () => {
  if (!Account) {
    const module = await import("../../modules/auth/account.model");
    Account = module.default;
  }
  return Account;
};

// JWT Authentication middleware
export const auth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    // 1. Kiểm tra header Authorization trước (cho Postman/Mobile)
    // 2. Nếu không có thì lấy từ Cookie (Web)
    let token;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Không có token xác thực" },
      });
      return;
    }
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string };

    const AccountModel = await getAccountModel();
    const account = await AccountModel.findById(decoded.id)
      .populate("roleId")
      .populate("profileId");

    if (!account) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Tài khoản không tồn tại" },
      });
      return;
    }

    if (!account.active) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Tài khoản đã bị vô hiệu hóa" },
      });
      return;
    }

    req.user = account;
    // @ts-ignore - profile added in AuthRequest type
    req.profile = account.profileId;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Token không hợp lệ" },
    });
  }
};

// Admin only middleware
export const adminOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const roleCode = (req.user?.roleId as any)?.code;
  if (roleCode !== "ADMIN" && roleCode !== "admin") {
    res.status(403).json({
      success: false,
      error: { code: "FORBIDDEN", message: "Chỉ admin mới có quyền" },
    });
    return;
  }
  next();
};

// Admin or Supervisor middleware
export const adminOrSupervisor = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const roleCode = (req.user?.roleId as any)?.code;
  const isAuthorized = ["ADMIN", "admin", "FAC_MANAGER", "supervisor", "SUPERVISOR"].includes(roleCode || "");

  if (!isAuthorized) {
    res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Chỉ admin hoặc quản lý/giám sát mới có quyền",
      },
    });
    return;
  }
  next();
};

// Manager only middleware (Factory Manager or Supervisor)
export const managerOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const roleCode = (req.user?.roleId as any)?.code?.toLowerCase();
  const isAuthorized = ["fac_manager", "supervisor"].includes(roleCode || "");

  if (!isAuthorized) {
    res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Chỉ quản lý hoặc giám sát nhà máy mới có quyền",
      },
    });
    return;
  }
  next();
};

// Factory Manager only middleware
export const facManagerOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const roleCode = (req.user?.roleId as any)?.code?.toLowerCase();
  const isAuthorized = roleCode === "fac_manager";

  if (!isAuthorized) {
    res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Chỉ quản lý nhà máy mới có quyền thực hiện thao tác này",
      },
    });
    return;
  }
  next();
};

// Role-based authorization
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const roleCode = (req.user?.roleId as any)?.code;
    if (!req.user || !roles.includes(roleCode || "")) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Không có quyền truy cập" },
      });
      return;
    }
    next();
  };
};
