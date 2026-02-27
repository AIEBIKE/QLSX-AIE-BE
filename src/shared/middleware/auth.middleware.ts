import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../../config/env";
import { AuthRequest, IUser } from "../../types";

// Lazy load User model to prevent circular dependencies
let User: typeof import("..//../modules/auth/user.model").default;

const getUser = async () => {
  if (!User) {
    const module = await import("../../modules/auth/user.model");
    User = module.default;
  }
  return User;
};

// JWT Authentication middleware
export const auth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Không có token xác thực" },
      });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string };

    const UserModel = await getUser();
    const user = await UserModel.findById(decoded.id);

    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User không tồn tại" },
      });
      return;
    }

    if (!user.active) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Tài khoản đã bị vô hiệu hóa" },
      });
      return;
    }

    req.user = user as IUser;
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
  if (req.user?.role !== "admin") {
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
  if (req.user?.role !== "admin" && req.user?.role !== "supervisor") {
    res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Chỉ admin hoặc supervisor mới có quyền",
      },
    });
    return;
  }
  next();
};

// Role-based authorization
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Không có quyền truy cập" },
      });
      return;
    }
    next();
  };
};
