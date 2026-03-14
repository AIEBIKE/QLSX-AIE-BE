import { Request, Response, NextFunction } from "express";

type AsyncFunction = (
  req: any,
  res: Response,
  next: NextFunction,
) => Promise<any>;

/**
 * =============================================
 * ASYNC HANDLER - Improved Version
 * =============================================
 * Tự động bọc các hàm async và chuyển lỗi vào next(error).
 * Sử dụng cấu trúc gọn gàng từ gợi ý của đạo hữu.
 */
export const asyncHandler =
  (execution: AsyncFunction) =>
  (req: Request, res: Response, next: NextFunction) => {
    execution(req, res, next).catch(next);
  };

export default asyncHandler;
