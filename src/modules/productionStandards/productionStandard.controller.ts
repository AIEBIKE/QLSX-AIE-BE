import { Response, NextFunction } from "express";
import ProductionStandard from "./productionStandard.model";
import { AuthRequest } from "../../types";

export const getAll = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { vehicleTypeId, operationId } = req.query;
    const filter: Record<string, unknown> = {};
    if (vehicleTypeId) filter.vehicleTypeId = vehicleTypeId;
    if (operationId) filter.operationId = operationId;

    const standards = await ProductionStandard.find(filter)
      .populate("vehicleTypeId", "name code")
      .populate({
        path: "operationId",
        select: "name code processId",
        populate: { path: "processId", select: "name code" },
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: standards.length, data: standards });
  } catch (error) {
    next(error);
  }
};

export const getById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const standard = await ProductionStandard.findById(req.params.id)
      .populate("vehicleTypeId", "name code")
      .populate("operationId", "name code");

    if (!standard) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy tiêu chuẩn" },
      });
      return;
    }

    res.json({ success: true, data: standard });
  } catch (error) {
    next(error);
  }
};

export const create = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      vehicleTypeId,
      operationId,
      expectedQuantity,
      bonusPerUnit,
      penaltyPerUnit,
      description,
    } = req.body;

    const existing = await ProductionStandard.findOne({
      vehicleTypeId,
      operationId,
    });
    if (existing) {
      res.status(400).json({
        success: false,
        error: {
          code: "DUPLICATE",
          message: "Tiêu chuẩn cho loại xe và thao tác này đã tồn tại",
        },
      });
      return;
    }

    const standard = await ProductionStandard.create({
      vehicleTypeId,
      operationId,
      expectedQuantity,
      bonusPerUnit: bonusPerUnit || 0,
      penaltyPerUnit: penaltyPerUnit || 0,
      description,
    });

    const populated = await ProductionStandard.findById(standard._id)
      .populate("vehicleTypeId", "name code")
      .populate("operationId", "name code");

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

export const update = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const standard = await ProductionStandard.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    )
      .populate("vehicleTypeId", "name code")
      .populate("operationId", "name code");

    if (!standard) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy tiêu chuẩn" },
      });
      return;
    }

    res.json({ success: true, data: standard });
  } catch (error) {
    next(error);
  }
};

export const remove = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const standard = await ProductionStandard.findByIdAndDelete(req.params.id);

    if (!standard) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy tiêu chuẩn" },
      });
      return;
    }

    res.json({ success: true, message: "Đã xóa tiêu chuẩn" });
  } catch (error) {
    next(error);
  }
};
