import { Response, NextFunction } from "express";
import DailyRegistration from "./dailyRegistration.model";
import { ProductionOrder } from "../productionOrders";
import { ProductionStandard } from "../productionStandards";
import { Operation } from "../operations";
import { Process } from "../processes";
import { Shift } from "../shifts";
import { AuthRequest, IOperation, IProcess } from "../../types";

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export const getCurrentOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const activeOrder = await ProductionOrder.findOne({
      status: "in_progress",
    }).populate("vehicleTypeId");

    if (!activeOrder) {
      res.json({
        success: true,
        data: null,
        message: "Không có lệnh sản xuất đang thực hiện",
      });
      return;
    }

    const vehicleTypeId = (
      activeOrder.vehicleTypeId as unknown as { _id: string }
    )._id;
    const processes = await Process.find({ vehicleTypeId, active: true }).sort({
      order: 1,
    });

    const processIds = processes.map((p) => p._id);
    const operations = await Operation.find({
      processId: { $in: processIds },
      active: true,
    }).populate("processId", "name code order");

    const { start, end } = getTodayRange();
    const todayRegs = await DailyRegistration.find({
      productionOrderId: activeOrder._id,
      date: { $gte: start, $lte: end },
      status: { $ne: "reassigned" },
    }).populate("userId", "name code");

    const operationsWithAvailability = operations.map((op) => {
      const opObj = op.toObject() as IOperation;
      const regs = todayRegs.filter(
        (r) => r.operationId.toString() === op._id.toString(),
      );
      return {
        ...opObj,
        currentWorkers: regs.length,
        isAvailable: regs.length < op.maxWorkers,
        registeredBy: regs.map((r) => {
          const user = r.userId as unknown as {
            _id: string;
            name: string;
            code: string;
          };
          return { userId: user._id, name: user.name, code: user.code };
        }),
      };
    });

    res.json({
      success: true,
      data: {
        order: activeOrder,
        processes,
        operations: operationsWithAvailability,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getToday = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { start, end } = getTodayRange();

    const registrations = await DailyRegistration.find({
      userId: req.user?._id,
      date: { $gte: start, $lte: end },
    })
      .populate("operationId", "name code")
      .populate("productionOrderId", "orderCode");

    res.json({ success: true, data: registrations });
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
    const { operationId } = req.body;

    const activeOrder = await ProductionOrder.findOne({
      status: "in_progress",
    });
    if (!activeOrder) {
      res.status(400).json({
        success: false,
        error: {
          code: "NO_ORDER",
          message: "Không có lệnh sản xuất đang thực hiện",
        },
      });
      return;
    }

    const operation =
      await Operation.findById(operationId).populate("processId");
    if (!operation) {
      res.status(400).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Thao tác không tồn tại" },
      });
      return;
    }

    const processDoc = operation.processId as unknown as IProcess;
    if (
      processDoc.vehicleTypeId.toString() !==
      activeOrder.vehicleTypeId.toString()
    ) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_OP",
          message: "Thao tác không thuộc loại xe của lệnh hiện tại",
        },
      });
      return;
    }

    const { start, end } = getTodayRange();
    const existingRegs = await DailyRegistration.countDocuments({
      operationId,
      date: { $gte: start, $lte: end },
      status: { $ne: "reassigned" },
    });

    if (existingRegs >= operation.maxWorkers) {
      res.status(400).json({
        success: false,
        error: { code: "FULL", message: "Thao tác này đã đủ người đăng ký" },
      });
      return;
    }

    // Kiểm tra duplicate registration cho cùng lệnh sản xuất
    const userReg = await DailyRegistration.findOne({
      userId: req.user?._id,
      operationId,
      productionOrderId: activeOrder._id, // Thêm check theo lệnh sản xuất
      date: { $gte: start, $lte: end },
    });

    if (userReg) {
      res.status(400).json({
        success: false,
        error: {
          code: "DUPLICATE",
          message: "Bạn đã đăng ký thao tác này cho lệnh sản xuất hiện tại",
        },
      });
      return;
    }

    let shift = await Shift.findOne({
      userId: req.user?._id,
      date: { $gte: start, $lte: end },
    });

    if (!shift) {
      shift = await Shift.create({
        userId: req.user?._id,
        date: new Date(),
        startTime: new Date(),
        status: "active",
      });
    }

    const standard = await ProductionStandard.findOne({
      vehicleTypeId: activeOrder.vehicleTypeId,
      operationId,
    });

    const expectedQuantity = standard ? standard.expectedQuantity : 0;

    const registration = await DailyRegistration.create({
      userId: req.user?._id,
      shiftId: shift._id,
      date: new Date(),
      productionOrderId: activeOrder._id,
      operationId,
      expectedQuantity,
      status: "registered",
    });

    const populated = await DailyRegistration.findById(registration._id)
      .populate("operationId", "name code")
      .populate("productionOrderId", "orderCode");

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

export const complete = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { actualQuantity, interruptionNote, interruptionMinutes } = req.body;

    const registration = await DailyRegistration.findById(req.params.id);
    if (!registration) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy đăng ký" },
      });
      return;
    }

    if (registration.userId.toString() !== req.user?._id.toString()) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Không có quyền" },
      });
      return;
    }

    const order = await ProductionOrder.findById(
      registration.productionOrderId,
    );
    const standard = await ProductionStandard.findOne({
      vehicleTypeId: order?.vehicleTypeId,
      operationId: registration.operationId,
    });

    const expectedQty =
      registration.adjustedExpectedQty || registration.expectedQuantity;
    const deviation = actualQuantity - expectedQty;

    let bonusAmount = 0;
    let penaltyAmount = 0;

    if (standard) {
      if (deviation > 0) bonusAmount = deviation * standard.bonusPerUnit;
      else if (deviation < 0)
        penaltyAmount = Math.abs(deviation) * standard.penaltyPerUnit;
    }

    registration.actualQuantity = actualQuantity;
    registration.deviation = deviation;
    registration.interruptionNote = interruptionNote || "";
    registration.interruptionMinutes = interruptionMinutes || 0;
    registration.bonusAmount = bonusAmount;
    registration.penaltyAmount = penaltyAmount;
    registration.status = "completed";

    // Tính thời gian làm việc
    const startTime = registration.checkInTime || registration.registeredAt;
    const endTime = new Date();
    const totalMinutes = Math.round(
      (endTime.getTime() - startTime.getTime()) / 60000,
    );
    registration.workingMinutes = Math.max(
      0,
      totalMinutes - (interruptionMinutes || 0),
    );
    registration.checkOutTime = endTime;

    await registration.save();

    const populated = await DailyRegistration.findById(registration._id)
      .populate("operationId", "name code")
      .populate("productionOrderId", "orderCode");

    res.json({ success: true, data: populated });
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
    const registration = await DailyRegistration.findById(req.params.id);

    if (!registration) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy đăng ký" },
      });
      return;
    }

    if (
      registration.userId.toString() !== req.user?._id.toString() &&
      req.user?.role !== "admin"
    ) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Không có quyền" },
      });
      return;
    }

    if (registration.status === "completed") {
      res.status(400).json({
        success: false,
        error: {
          code: "COMPLETED",
          message: "Không thể hủy đăng ký đã hoàn thành",
        },
      });
      return;
    }

    await registration.deleteOne();
    res.json({ success: true, message: "Đã hủy đăng ký" });
  } catch (error) {
    next(error);
  }
};

// Admin methods
export const adminGetAll = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { date, productionOrderId, status } = req.query;
    const filter: Record<string, unknown> = {};

    if (date) {
      const d = new Date(date as string);
      d.setHours(0, 0, 0, 0);
      const dEnd = new Date(date as string);
      dEnd.setHours(23, 59, 59, 999);
      filter.date = { $gte: d, $lte: dEnd };
    }

    if (productionOrderId) filter.productionOrderId = productionOrderId;
    if (status) filter.status = status;

    const registrations = await DailyRegistration.find(filter)
      .populate("userId", "name code")
      .populate("operationId", "name code")
      .populate("productionOrderId", "orderCode")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: registrations.length,
      data: registrations,
    });
  } catch (error) {
    next(error);
  }
};

export const adminAdjust = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { adjustedExpectedQty, adjustmentNote } = req.body;

    const registration = await DailyRegistration.findById(req.params.id);
    if (!registration) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy đăng ký" },
      });
      return;
    }

    registration.adjustedExpectedQty = adjustedExpectedQty;
    registration.adjustmentNote = adjustmentNote || "";
    registration.adjustedBy = req.user?._id;

    if (
      registration.status === "completed" &&
      registration.actualQuantity !== null
    ) {
      const order = await ProductionOrder.findById(
        registration.productionOrderId,
      );
      const standard = await ProductionStandard.findOne({
        vehicleTypeId: order?.vehicleTypeId,
        operationId: registration.operationId,
      });

      const deviation =
        (registration.actualQuantity ?? 0) - adjustedExpectedQty;
      registration.deviation = deviation;

      if (standard) {
        if (deviation > 0) {
          registration.bonusAmount = deviation * standard.bonusPerUnit;
          registration.penaltyAmount = 0;
        } else if (deviation < 0) {
          registration.penaltyAmount =
            Math.abs(deviation) * standard.penaltyPerUnit;
          registration.bonusAmount = 0;
        } else {
          registration.bonusAmount = 0;
          registration.penaltyAmount = 0;
        }
      }
    }

    await registration.save();

    const populated = await DailyRegistration.findById(registration._id)
      .populate("userId", "name code")
      .populate("operationId", "name code")
      .populate("adjustedBy", "name");

    res.json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

export const adminReassign = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId, operationId, expectedQuantity } = req.body;

    const activeOrder = await ProductionOrder.findOne({
      status: "in_progress",
    });
    if (!activeOrder) {
      res.status(400).json({
        success: false,
        error: {
          code: "NO_ORDER",
          message: "Không có lệnh sản xuất đang thực hiện",
        },
      });
      return;
    }

    const { start, end } = getTodayRange();

    let shift = await Shift.findOne({
      userId,
      date: { $gte: start, $lte: end },
    });

    if (!shift) {
      shift = await Shift.create({
        userId,
        date: new Date(),
        startTime: new Date(),
        status: "active",
      });
    }

    let expQty = expectedQuantity;
    if (!expQty) {
      const standard = await ProductionStandard.findOne({
        vehicleTypeId: activeOrder.vehicleTypeId,
        operationId,
      });
      expQty = standard ? standard.expectedQuantity : 0;
    }

    const registration = await DailyRegistration.create({
      userId,
      shiftId: shift._id,
      date: new Date(),
      productionOrderId: activeOrder._id,
      operationId,
      expectedQuantity: expQty,
      status: "registered",
      adjustmentNote: "Được quản lý bổ sung",
    });

    const populated = await DailyRegistration.findById(registration._id)
      .populate("userId", "name code")
      .populate("operationId", "name code");

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};
