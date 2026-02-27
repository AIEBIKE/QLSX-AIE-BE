import { Response, NextFunction } from "express";
import Operation from "./operation.model";
import { AuthRequest } from "../../types";

export const getAll = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { processId, active } = req.query;
    const filter: Record<string, unknown> = {};

    if (processId) filter.processId = processId;
    if (active !== undefined) {
      filter.active = active === "true";
    } else {
      filter.active = true;
    }

    const operations = await Operation.find(filter)
      .populate("processId", "name code order")
      .sort({ code: 1 });

    res.json({ success: true, data: operations });
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
    const operation = await Operation.findById(req.params.id).populate(
      "processId",
      "name code",
    );

    if (!operation) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy thao tác" },
      });
      return;
    }

    res.json({ success: true, data: operation });
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
      processId,
      name,
      code,
      difficulty,
      allowTeamwork,
      maxWorkers,
      description,
    } = req.body;

    const existing = await Operation.findOne({ code });

    if (existing) {
      if (existing.active) {
        res.status(400).json({
          success: false,
          error: { code: "DUPLICATE", message: "Mã thao tác đã tồn tại" },
        });
        return;
      }

      // Tính toán chuyển đổi standardQuantity ↔ standardMinutes cho existing
      const {
        standardQuantity,
        standardMinutes,
        workingMinutesPerShift = 480,
        instructions,
      } = req.body;

      let calcStandardMinutes = standardMinutes || 0;
      let calcStandardQuantity = standardQuantity || 0;

      if (standardQuantity && standardQuantity > 0 && !standardMinutes) {
        calcStandardMinutes =
          Math.round((workingMinutesPerShift / standardQuantity) * 100) / 100;
      } else if (standardMinutes && standardMinutes > 0 && !standardQuantity) {
        calcStandardQuantity =
          Math.round((workingMinutesPerShift / standardMinutes) * 100) / 100;
      }

      existing.processId = processId;
      existing.name = name;
      existing.difficulty = difficulty || 1;
      existing.allowTeamwork = allowTeamwork || false;
      existing.maxWorkers = maxWorkers || 1;
      existing.description = description || "";
      existing.standardQuantity = calcStandardQuantity;
      existing.standardMinutes = calcStandardMinutes;
      existing.workingMinutesPerShift = workingMinutesPerShift;
      existing.instructions = instructions || "";
      existing.active = true;
      await existing.save();

      const populated = await Operation.findById(existing._id).populate(
        "processId",
        "name code",
      );
      res.status(201).json({ success: true, data: populated });
      return;
    }

    // Tính toán chuyển đổi standardQuantity ↔ standardMinutes
    const {
      standardQuantity,
      standardMinutes,
      workingMinutesPerShift = 480,
      instructions,
    } = req.body;

    let calcStandardMinutes = standardMinutes || 0;
    let calcStandardQuantity = standardQuantity || 0;

    if (standardQuantity && standardQuantity > 0 && !standardMinutes) {
      // Tính phút từ số lượng: phút = tổng phút ca / số lượng
      calcStandardMinutes =
        Math.round((workingMinutesPerShift / standardQuantity) * 100) / 100;
    } else if (standardMinutes && standardMinutes > 0 && !standardQuantity) {
      // Tính số lượng từ phút: số lượng = tổng phút ca / phút mỗi sản phẩm
      calcStandardQuantity =
        Math.round((workingMinutesPerShift / standardMinutes) * 100) / 100;
    }

    const operation = await Operation.create({
      processId,
      name,
      code,
      difficulty: difficulty || 1,
      allowTeamwork: allowTeamwork || false,
      maxWorkers: maxWorkers || 1,
      description: description || "",
      standardQuantity: calcStandardQuantity,
      standardMinutes: calcStandardMinutes,
      workingMinutesPerShift,
      instructions: instructions || "",
    });

    const populated = await Operation.findById(operation._id).populate(
      "processId",
      "name code",
    );
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
    const updateData = { ...req.body };

    // Tính toán chuyển đổi standardQuantity ↔ standardMinutes
    const workingMinutesPerShift = updateData.workingMinutesPerShift || 480;

    if (
      updateData.standardQuantity &&
      updateData.standardQuantity > 0 &&
      !updateData.standardMinutes
    ) {
      updateData.standardMinutes =
        Math.round(
          (workingMinutesPerShift / updateData.standardQuantity) * 100,
        ) / 100;
    } else if (
      updateData.standardMinutes &&
      updateData.standardMinutes > 0 &&
      !updateData.standardQuantity
    ) {
      updateData.standardQuantity =
        Math.round(
          (workingMinutesPerShift / updateData.standardMinutes) * 100,
        ) / 100;
    }

    const operation = await Operation.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      },
    ).populate("processId", "name code");

    if (!operation) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy thao tác" },
      });
      return;
    }

    res.json({ success: true, data: operation });
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
    const operation = await Operation.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true },
    );

    if (!operation) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy thao tác" },
      });
      return;
    }

    res.json({ success: true, message: "Đã xóa thao tác" });
  } catch (error) {
    next(error);
  }
};
