import { Request, Response, NextFunction } from "express";

interface CustomError extends Error {
  statusCode?: number;
  code?: number | string;
  keyValue?: Record<string, unknown>;
  errors?: Record<string, { message: string }>;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  console.error(err.stack);

  // Mongoose validation error
  if (err.name === "ValidationError" && err.errors) {
    const messages = Object.values(err.errors).map((e) => e.message);
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: messages.join(", ") },
    });
    return;
  }

  // Mongoose duplicate key error
  if (err.code === 11000 && err.keyValue) {
    const field = Object.keys(err.keyValue)[0];
    res.status(400).json({
      success: false,
      error: { code: "DUPLICATE_ERROR", message: `${field} đã tồn tại` },
    });
    return;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    res.status(400).json({
      success: false,
      error: { code: "INVALID_ID", message: "ID không hợp lệ" },
    });
    return;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    res.status(401).json({
      success: false,
      error: { code: "INVALID_TOKEN", message: "Token không hợp lệ" },
    });
    return;
  }

  if (err.name === "TokenExpiredError") {
    res.status(401).json({
      success: false,
      error: { code: "TOKEN_EXPIRED", message: "Token đã hết hạn" },
    });
    return;
  }

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: (err.code as string) || "SERVER_ERROR",
      message: err.message || "Lỗi server",
    },
  });
};
