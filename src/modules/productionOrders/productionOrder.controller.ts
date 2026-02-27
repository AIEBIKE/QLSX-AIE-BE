import { Response, NextFunction } from "express";
import ProductionOrder from "./productionOrder.model";
import { VehicleType } from "../vehicleTypes";
import { Process } from "../processes";
import DailyRegistration from "../registrations/dailyRegistration.model";
import { AuthRequest } from "../../types";

export const getAll = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status, vehicleTypeId } = req.query;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (vehicleTypeId) filter.vehicleTypeId = vehicleTypeId;

    const orders = await ProductionOrder.find(filter)
      .populate("vehicleTypeId", "name code")
      .populate("createdBy", "name code")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    next(error);
  }
};

export const getActive = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const activeOrder = await ProductionOrder.findOne({ status: "in_progress" })
      .populate("vehicleTypeId")
      .populate("createdBy", "name");

    res.json({
      success: true,
      data: activeOrder,
      message: activeOrder
        ? undefined
        : "Không có lệnh sản xuất đang thực hiện",
    });
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
    const order = await ProductionOrder.findById(req.params.id)
      .populate("vehicleTypeId")
      .populate("createdBy", "name code");

    if (!order) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy lệnh sản xuất" },
      });
      return;
    }

    res.json({ success: true, data: order });
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
      quantity,
      frameNumbers,
      engineNumbers,
      startDate,
      expectedEndDate,
      note,
    } = req.body;

    const vehicleType = await VehicleType.findById(vehicleTypeId);
    if (!vehicleType) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_REF", message: "Loại xe không tồn tại" },
      });
      return;
    }

    const year = new Date().getFullYear();
    const count = await ProductionOrder.countDocuments({
      createdAt: { $gte: new Date(year, 0, 1) },
    });
    const orderCode = `LSX-${year}-${String(count + 1).padStart(3, "0")}`;

    const order = await ProductionOrder.create({
      orderCode,
      vehicleTypeId,
      quantity,
      frameNumbers: frameNumbers || [],
      engineNumbers: engineNumbers || [],
      startDate,
      expectedEndDate,
      note,
      createdBy: req.user?._id,
    });

    const populated = await ProductionOrder.findById(order._id)
      .populate("vehicleTypeId", "name code")
      .populate("createdBy", "name");

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
    const order = await ProductionOrder.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    ).populate("vehicleTypeId", "name code");

    if (!order) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy lệnh sản xuất" },
      });
      return;
    }

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "in_progress", "completed", "cancelled"];

    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_STATUS", message: "Trạng thái không hợp lệ" },
      });
      return;
    }

    if (status === "in_progress") {
      const existingActive = await ProductionOrder.findOne({
        status: "in_progress",
        _id: { $ne: req.params.id },
      });
      if (existingActive) {
        res.status(400).json({
          success: false,
          error: {
            code: "ACTIVE_EXISTS",
            message: "Đã có lệnh sản xuất đang thực hiện",
          },
        });
        return;
      }
    }

    const updateData: Record<string, unknown> = { status };
    if (status === "completed") {
      updateData.actualEndDate = new Date();
    }

    const order = await ProductionOrder.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true },
    ).populate("vehicleTypeId", "name code");

    if (!order) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy lệnh sản xuất" },
      });
      return;
    }

    res.json({ success: true, data: order });
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
    const order = await ProductionOrder.findById(req.params.id);

    if (!order) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy lệnh sản xuất" },
      });
      return;
    }

    if (order.status === "in_progress") {
      res.status(400).json({
        success: false,
        error: {
          code: "IN_PROGRESS",
          message: "Không thể xóa lệnh đang thực hiện",
        },
      });
      return;
    }

    await order.deleteOne();
    res.json({ success: true, message: "Đã xóa lệnh sản xuất" });
  } catch (error) {
    next(error);
  }
};

// Kiểm tra có thể hoàn thành lệnh sản xuất không
export const checkCompletion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const order = await ProductionOrder.findById(req.params.id).populate(
      "vehicleTypeId",
    );
    if (!order) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy lệnh sản xuất" },
      });
      return;
    }

    // Lấy tất cả các công đoạn của loại xe
    const processes = await Process.find({
      vehicleTypeId: order.vehicleTypeId,
      active: true,
    }).sort({ order: 1 });

    // Tính tổng số lượng hoàn thành cho mỗi công đoạn
    const registrations = await DailyRegistration.find({
      productionOrderId: order._id,
      status: "completed",
    }).populate("operationId");

    // Group theo processId và tính tổng
    const completedByProcess: Record<string, number> = {};
    for (const reg of registrations) {
      const operation = reg.operationId as { processId?: string };
      if (operation?.processId) {
        const pId = operation.processId.toString();
        completedByProcess[pId] =
          (completedByProcess[pId] || 0) + (reg.actualQuantity || 0);
      }
    }

    const incompleteProcesses: {
      processId: string;
      processName: string;
      required: number;
      completed: number;
      remaining: number;
    }[] = [];

    for (const process of processes) {
      const completed = completedByProcess[process._id.toString()] || 0;
      const required = order.quantity;
      if (completed < required) {
        incompleteProcesses.push({
          processId: process._id.toString(),
          processName: process.name,
          required,
          completed,
          remaining: required - completed,
        });
      }
    }

    const canComplete = incompleteProcesses.length === 0;

    // Lưu lịch sử kiểm tra
    await ProductionOrder.findByIdAndUpdate(order._id, {
      $push: {
        completionChecks: {
          checkedAt: new Date(),
          checkedBy: req.user?._id,
          canComplete,
          incompleteProcesses: incompleteProcesses.map((p) => ({
            processId: p.processId,
            processName: p.processName,
            remaining: p.remaining,
          })),
        },
      },
    });

    res.json({
      success: true,
      data: {
        canComplete,
        incompleteProcesses,
        message: canComplete
          ? "Có thể hoàn thành lệnh sản xuất"
          : "Còn công đoạn chưa hoàn thành",
      },
    });
  } catch (error) {
    next(error);
  }
};

// Hoàn thành lệnh sản xuất
export const completeOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const order = await ProductionOrder.findById(req.params.id);
    if (!order) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy lệnh sản xuất" },
      });
      return;
    }

    if (order.status !== "in_progress") {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_STATUS",
          message: "Chỉ có thể hoàn thành lệnh đang thực hiện",
        },
      });
      return;
    }

    // Kiểm tra các công đoạn
    const processes = await Process.find({
      vehicleTypeId: order.vehicleTypeId,
      active: true,
    });

    const registrations = await DailyRegistration.find({
      productionOrderId: order._id,
      status: "completed",
    }).populate("operationId");

    const completedByProcess: Record<string, number> = {};
    for (const reg of registrations) {
      const operation = reg.operationId as { processId?: string };
      if (operation?.processId) {
        const pId = operation.processId.toString();
        completedByProcess[pId] =
          (completedByProcess[pId] || 0) + (reg.actualQuantity || 0);
      }
    }

    const incomplete = processes.filter((p) => {
      const completed = completedByProcess[p._id.toString()] || 0;
      return completed < order.quantity;
    });

    if (incomplete.length > 0 && !req.body.forceComplete) {
      res.status(400).json({
        success: false,
        error: {
          code: "INCOMPLETE_PROCESSES",
          message: `Còn ${incomplete.length} công đoạn chưa hoàn thành: ${incomplete.map((p) => p.name).join(", ")}`,
        },
        data: {
          incompleteProcesses: incomplete.map((p) => ({
            id: p._id,
            name: p.name,
          })),
        },
      });
      return;
    }

    const updated = await ProductionOrder.findByIdAndUpdate(
      order._id,
      {
        status: "completed",
        actualEndDate: new Date(),
      },
      { new: true },
    ).populate("vehicleTypeId", "name code");

    res.json({
      success: true,
      data: updated,
      message: "Đã hoàn thành lệnh sản xuất",
    });
  } catch (error) {
    next(error);
  }
};

// Xem tiến độ theo công đoạn
export const getProgress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const order = await ProductionOrder.findById(req.params.id).populate(
      "vehicleTypeId",
    );
    if (!order) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy lệnh sản xuất" },
      });
      return;
    }

    const processes = await Process.find({
      vehicleTypeId: order.vehicleTypeId,
      active: true,
    }).sort({ order: 1 });

    const registrations = await DailyRegistration.find({
      productionOrderId: order._id,
    })
      .populate("userId", "name code")
      .populate("operationId", "name code processId");

    // Group theo công đoạn
    const progressByProcess = processes.map((process) => {
      const processRegs = registrations.filter((r) => {
        const op = r.operationId as { processId?: { toString: () => string } };
        return op?.processId?.toString() === process._id.toString();
      });

      const completed = processRegs
        .filter((r) => r.status === "completed")
        .reduce((sum, r) => sum + (r.actualQuantity || 0), 0);

      const workers = [
        ...new Set(
          processRegs.map((r) => {
            const u = r.userId as { name?: string; code?: string };
            return u?.name || u?.code;
          }),
        ),
      ];

      return {
        processId: process._id,
        processName: process.name,
        processCode: process.code,
        order: process.order,
        required: order.quantity,
        completed,
        percentage: Math.round((completed / order.quantity) * 100),
        status:
          completed >= order.quantity
            ? "completed"
            : completed > 0
              ? "in_progress"
              : "pending",
        workers,
        registrations: processRegs.length,
      };
    });

    res.json({
      success: true,
      data: {
        order: {
          _id: order._id,
          orderCode: order.orderCode,
          quantity: order.quantity,
          status: order.status,
        },
        progress: progressByProcess,
        summary: {
          totalProcesses: processes.length,
          completedProcesses: progressByProcess.filter(
            (p) => p.status === "completed",
          ).length,
          inProgressProcesses: progressByProcess.filter(
            (p) => p.status === "in_progress",
          ).length,
          overallPercentage: Math.round(
            progressByProcess.reduce((sum, p) => sum + p.percentage, 0) /
              processes.length,
          ),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Báo cáo chi tiết lệnh sản xuất
export const getReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const order = await ProductionOrder.findById(req.params.id)
      .populate("vehicleTypeId", "name code")
      .populate("createdBy", "name code");

    if (!order) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy lệnh sản xuất" },
      });
      return;
    }

    const registrations = await DailyRegistration.find({
      productionOrderId: order._id,
    })
      .populate("userId", "name code department")
      .populate({
        path: "operationId",
        select: "name code processId",
        populate: { path: "processId", select: "name code order" },
      })
      .populate("shiftId", "date startTime endTime")
      .sort({ date: 1, createdAt: 1 });

    // Group theo ngày và công nhân
    const reportByDate: Record<string, unknown[]> = {};
    for (const reg of registrations) {
      const dateKey = new Date(reg.date).toISOString().split("T")[0];
      if (!reportByDate[dateKey]) {
        reportByDate[dateKey] = [];
      }

      const user = reg.userId as {
        name?: string;
        code?: string;
        department?: string;
      };
      const operation = reg.operationId as {
        name?: string;
        code?: string;
        processId?: { name?: string; code?: string; order?: number };
      };

      reportByDate[dateKey].push({
        worker: {
          name: user?.name,
          code: user?.code,
          department: user?.department,
        },
        operation: {
          name: operation?.name,
          code: operation?.code,
        },
        process: {
          name: operation?.processId?.name,
          code: operation?.processId?.code,
          order: operation?.processId?.order,
        },
        expectedQuantity: reg.expectedQuantity,
        actualQuantity: reg.actualQuantity,
        deviation: reg.deviation,
        workingMinutes: reg.workingMinutes || 0,
        checkInTime: reg.checkInTime,
        checkOutTime: reg.checkOutTime,
        status: reg.status,
        isReplacement: reg.isReplacement,
        bonusAmount: reg.bonusAmount,
        penaltyAmount: reg.penaltyAmount,
      });
    }

    // Tổng hợp theo công nhân
    const workerSummary: Record<
      string,
      {
        name: string;
        code: string;
        totalQuantity: number;
        totalMinutes: number;
        totalBonus: number;
        totalPenalty: number;
        operations: number;
      }
    > = {};

    for (const reg of registrations) {
      const user = reg.userId as unknown as {
        _id?: { toString: () => string };
        name?: string;
        code?: string;
      };
      const id = user?._id?.toString() || "";
      if (!workerSummary[id]) {
        workerSummary[id] = {
          name: user?.name || "",
          code: user?.code || "",
          totalQuantity: 0,
          totalMinutes: 0,
          totalBonus: 0,
          totalPenalty: 0,
          operations: 0,
        };
      }
      workerSummary[id].totalQuantity += reg.actualQuantity || 0;
      workerSummary[id].totalMinutes += reg.workingMinutes || 0;
      workerSummary[id].totalBonus += reg.bonusAmount || 0;
      workerSummary[id].totalPenalty += reg.penaltyAmount || 0;
      workerSummary[id].operations += 1;
    }

    res.json({
      success: true,
      data: {
        order: {
          _id: order._id,
          orderCode: order.orderCode,
          vehicleType: order.vehicleTypeId,
          quantity: order.quantity,
          startDate: order.startDate,
          actualEndDate: order.actualEndDate,
          status: order.status,
          createdBy: order.createdBy,
        },
        dailyReport: reportByDate,
        workerSummary: Object.values(workerSummary),
        statistics: {
          totalRegistrations: registrations.length,
          totalCompleted: registrations.filter((r) => r.status === "completed")
            .length,
          totalQuantityProduced: registrations.reduce(
            (sum, r) => sum + (r.actualQuantity || 0),
            0,
          ),
          totalWorkingMinutes: registrations.reduce(
            (sum, r) => sum + (r.workingMinutes || 0),
            0,
          ),
          totalBonus: registrations.reduce(
            (sum, r) => sum + (r.bonusAmount || 0),
            0,
          ),
          totalPenalty: registrations.reduce(
            (sum, r) => sum + (r.penaltyAmount || 0),
            0,
          ),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Bổ sung công nhân vào công đoạn
export const assignWorker = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      userId,
      operationId,
      shiftId,
      expectedQuantity,
      replacesUserId,
      replacementReason,
    } = req.body;

    const order = await ProductionOrder.findById(req.params.id);
    if (!order) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy lệnh sản xuất" },
      });
      return;
    }

    if (order.status !== "in_progress") {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_STATUS",
          message: "Chỉ có thể bổ sung vào lệnh đang thực hiện",
        },
      });
      return;
    }

    // Tạo registration mới cho công nhân bổ sung
    const registration = await DailyRegistration.create({
      userId,
      shiftId,
      date: new Date(),
      productionOrderId: order._id,
      operationId,
      expectedQuantity,
      isReplacement: true,
      replacesUserId,
      replacementReason,
      status: "registered",
      checkInTime: new Date(),
    });

    const populated = await DailyRegistration.findById(registration._id)
      .populate("userId", "name code")
      .populate("operationId", "name code")
      .populate("replacesUserId", "name code");

    res.status(201).json({
      success: true,
      data: populated,
      message: "Đã bổ sung công nhân vào công đoạn",
    });
  } catch (error) {
    next(error);
  }
};
