import { Response, NextFunction } from "express";
import { AuthRequest } from "../../types";
import { processService, ServiceError } from "./process.service";

/**
 * Controller Layer: Chỉ xử lý HTTP request/response
 * - Parse request params, query, body
 * - Gọi service
 * - Format và trả response
 * - KHÔNG chứa business logic
 */

// GET all processes
export const getAll = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { vehicleTypeId, active } = req.query;

    const filter = {
      vehicleTypeId: vehicleTypeId as string | undefined,
      active: active !== undefined ? active === "true" : undefined,
    };

    const processes = await processService.getAll(filter);

    res.json({ success: true, data: processes });
  } catch (error) {
    next(error);
  }
};

// GET by ID
export const getById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const process = await processService.getById(req.params.id as string);

    res.json({ success: true, data: process });
  } catch (error) {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
      return;
    }
    next(error);
  }
};

// CREATE
export const create = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { vehicleTypeId, name, code, order, description } = req.body;

    const process = await processService.create({
      vehicleTypeId,
      name,
      code,
      order,
      description,
    });

    res.status(201).json({ success: true, data: process });
  } catch (error) {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
      return;
    }
    next(error);
  }
};

// UPDATE
export const update = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const process = await processService.update(
      req.params.id as string,
      req.body,
    );

    res.json({ success: true, data: process });
  } catch (error) {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
      return;
    }
    next(error);
  }
};

// DELETE (soft)
export const remove = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await processService.remove(req.params.id as string);

    res.json({ success: true, message: "Đã xóa công đoạn" });
  } catch (error) {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
      return;
    }
    next(error);
  }
};
