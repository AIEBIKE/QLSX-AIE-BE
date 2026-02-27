import { Response, NextFunction } from "express";
import User from "./user.model";
import DailyRegistration from "../registrations/dailyRegistration.model";
import { AuthRequest } from "../../types";

// Get all users
export const getAll = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const users = await User.find().select("-password");
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

// Get user by ID
export const getById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy người dùng" },
      });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// Create user
export const create = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { code, name, password, role, department } = req.body;

    const existing = await User.findOne({ code });
    if (existing) {
      res.status(400).json({
        success: false,
        error: { code: "DUPLICATE", message: "Mã nhân viên đã tồn tại" },
      });
      return;
    }

    const user = await User.create({
      code,
      name,
      password,
      role: role || "worker",
      department,
    });

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        code: user.code,
        name: user.name,
        role: user.role,
        department: user.department,
        active: user.active,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update user
export const update = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, password, role, department, active } = req.body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (department !== undefined) updateData.department = department;
    if (active !== undefined) updateData.active = active;

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy người dùng" },
      });
      return;
    }

    // Update password separately if provided
    if (password) {
      const userWithPwd = await User.findById(req.params.id);
      if (userWithPwd) {
        userWithPwd.password = password;
        await userWithPwd.save();
      }
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// Delete user
export const remove = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy người dùng" },
      });
      return;
    }

    res.json({ success: true, message: "Đã xóa người dùng" });
  } catch (error) {
    next(error);
  }
};

// Get user work history
export const getWorkHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { startDate, endDate, productionOrderId } = req.query;

    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy người dùng" },
      });
      return;
    }

    const filter: Record<string, unknown> = { userId: user._id };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate)
        (filter.date as Record<string, unknown>).$gte = new Date(
          startDate as string,
        );
      if (endDate)
        (filter.date as Record<string, unknown>).$lte = new Date(
          endDate as string,
        );
    }
    if (productionOrderId) filter.productionOrderId = productionOrderId;

    const registrations = await DailyRegistration.find(filter)
      .populate({
        path: "operationId",
        select: "name code processId",
        populate: { path: "processId", select: "name code" },
      })
      .populate("productionOrderId", "orderCode vehicleTypeId status")
      .populate("shiftId", "date startTime endTime")
      .sort({ date: -1 });

    // Tính thống kê
    const stats = {
      totalRegistrations: registrations.length,
      totalCompleted: registrations.filter((r) => r.status === "completed")
        .length,
      totalQuantity: registrations.reduce(
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
      averageDeviation:
        registrations.length > 0
          ? registrations.reduce((sum, r) => sum + (r.deviation || 0), 0) /
            registrations.length
          : 0,
    };

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          code: user.code,
          name: user.name,
          department: user.department,
          role: user.role,
        },
        registrations,
        statistics: stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get pending users (waiting for approval)
export const getPendingUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const users = await User.find({ status: "pending" })
      .select("-password")
      .sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

// Approve user
export const approveUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true },
    ).select("-password");

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy người dùng" },
      });
      return;
    }

    res.json({
      success: true,
      message: "Đã duyệt tài khoản thành công",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Reject user
export const rejectUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true },
    ).select("-password");

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy người dùng" },
      });
      return;
    }

    res.json({
      success: true,
      message: "Đã từ chối tài khoản",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Get all workers salary summary (for admin)
export const getAllWorkersSalary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { startDate, endDate, period } = req.query;

    // Calculate date range based on period
    let start: Date;
    let end: Date = new Date();

    if (startDate && endDate) {
      start = new Date(startDate as string);
      end = new Date(endDate as string);
    } else {
      // Default: this month
      start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }

    // Adjust based on period
    if (period === "week") {
      start = new Date();
      start.setDate(start.getDate() - 7);
    } else if (period === "month") {
      start = new Date();
      start.setMonth(start.getMonth() - 1);
    } else if (period === "year") {
      start = new Date();
      start.setFullYear(start.getFullYear() - 1);
    }

    // Get all workers
    const workers = await User.find({ role: "worker", status: "approved" })
      .select("_id code name department")
      .lean();

    // Get registrations for all workers
    const registrations = await DailyRegistration.find({
      userId: { $in: workers.map((w) => w._id) },
      date: { $gte: start, $lte: end },
      status: "completed",
    })
      .populate("userId", "code name department")
      .lean();

    // Aggregate by worker
    const workerStats: Record<
      string,
      {
        user: { _id: string; code: string; name: string; department?: string };
        totalQuantity: number;
        totalBonus: number;
        totalPenalty: number;
        totalNetIncome: number;
        registrationCount: number;
      }
    > = {};

    workers.forEach((w) => {
      workerStats[w._id.toString()] = {
        user: {
          _id: w._id.toString(),
          code: w.code,
          name: w.name,
          department: w.department,
        },
        totalQuantity: 0,
        totalBonus: 0,
        totalPenalty: 0,
        totalNetIncome: 0,
        registrationCount: 0,
      };
    });

    registrations.forEach((r) => {
      const userId = r.userId?._id?.toString();
      if (userId && workerStats[userId]) {
        workerStats[userId].totalQuantity += r.actualQuantity || 0;
        workerStats[userId].totalBonus += r.bonusAmount || 0;
        workerStats[userId].totalPenalty += r.penaltyAmount || 0;
        workerStats[userId].totalNetIncome +=
          (r.bonusAmount || 0) - (r.penaltyAmount || 0);
        workerStats[userId].registrationCount += 1;
      }
    });

    // Calculate totals
    const summary = {
      totalWorkers: workers.length,
      totalRegistrations: registrations.length,
      totalQuantity: registrations.reduce(
        (sum, r) => sum + (r.actualQuantity || 0),
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
      totalNetIncome: 0,
    };
    summary.totalNetIncome = summary.totalBonus - summary.totalPenalty;

    // Group by date for chart
    const dailyData: Record<
      string,
      { date: string; bonus: number; penalty: number; quantity: number }
    > = {};
    registrations.forEach((r) => {
      const dateStr = new Date(r.date).toISOString().split("T")[0];
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = {
          date: dateStr,
          bonus: 0,
          penalty: 0,
          quantity: 0,
        };
      }
      dailyData[dateStr].bonus += r.bonusAmount || 0;
      dailyData[dateStr].penalty += r.penaltyAmount || 0;
      dailyData[dateStr].quantity += r.actualQuantity || 0;
    });

    res.json({
      success: true,
      data: {
        summary,
        workers: Object.values(workerStats).sort(
          (a, b) => b.totalNetIncome - a.totalNetIncome,
        ),
        chartData: Object.values(dailyData).sort((a, b) =>
          a.date.localeCompare(b.date),
        ),
        dateRange: { start, end },
      },
    });
  } catch (error) {
    next(error);
  }
};
