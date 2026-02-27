import { Response, NextFunction } from "express";
import VehicleType from "./vehicleType.model";
import { AuthRequest } from "../../types";

// GET all vehicle types
export const getAll = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { active } = req.query;
    const filter: Record<string, unknown> = {};

    if (active !== undefined) {
      filter.active = active === "true";
    } else {
      filter.active = true;
    }

    const vehicleTypes = await VehicleType.find(filter).sort({ code: 1 });

    res.json({
      success: true,
      data: vehicleTypes,
    });
  } catch (error) {
    next(error);
  }
};

// GET vehicle type by ID
export const getById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const vehicleType = await VehicleType.findById(req.params.id);

    if (!vehicleType) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy loại xe" },
      });
      return;
    }

    res.json({
      success: true,
      data: vehicleType,
    });
  } catch (error) {
    next(error);
  }
};

// CREATE vehicle type
export const create = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, code, description } = req.body;

    // Check for soft-deleted with same code
    const existing = await VehicleType.findOne({ code });

    if (existing) {
      if (existing.active) {
        res.status(400).json({
          success: false,
          error: { code: "DUPLICATE", message: "Mã loại xe đã tồn tại" },
        });
        return;
      }

      // Reactivate
      existing.name = name;
      existing.description = description || "";
      existing.active = true;
      await existing.save();

      res.status(201).json({
        success: true,
        data: existing,
      });
      return;
    }

    const vehicleType = await VehicleType.create({
      name,
      code,
      description: description || "",
    });

    res.status(201).json({
      success: true,
      data: vehicleType,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE vehicle type
export const update = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, code, description, active } = req.body;

    const vehicleType = await VehicleType.findByIdAndUpdate(
      req.params.id,
      { name, code, description, active },
      { new: true, runValidators: true },
    );

    if (!vehicleType) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy loại xe" },
      });
      return;
    }

    res.json({
      success: true,
      data: vehicleType,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE (soft delete)
export const remove = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const vehicleType = await VehicleType.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true },
    );

    if (!vehicleType) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy loại xe" },
      });
      return;
    }

    res.json({
      success: true,
      message: "Đã xóa loại xe",
    });
  } catch (error) {
    next(error);
  }
};
