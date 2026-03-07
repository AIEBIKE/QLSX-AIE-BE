import { Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Account from "./account.model";
import Admin from "../admins/admin.model";
import Supervisor from "../supervisors/supervisor.model";
import FactoryManager from "../facManagers/facManager.model";
import Worker from "../workers/worker.model";
import Role from "../roles/role.model";
import DailyRegistration from "../registrations/dailyRegistration.model";
import { AuthRequest } from "../../types";

// Get all users
export const getAll = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const filter: any = {};
    const roleCode = (req.user?.roleId as any)?.code;
    const isAdmin = roleCode === "ADMIN" || roleCode === "admin";

    let targetFactoryId: any = null;

    if (!isAdmin) {
      targetFactoryId = req.profile?.factory_belong_to || req.profile?.factoryId;
    } else if (req.query.factoryId) {
      targetFactoryId = req.query.factoryId;
    }

    // Nếu có targetFactoryId thì chỉ lấy user của nhà máy đó
    if (targetFactoryId) {
      // Find worker profiles by factoryId first
      const workersInFactory = await Worker.find({ factoryId: targetFactoryId }).select("accountId");
      const supervisorInFactory = await Supervisor.find({ factory_belong_to: targetFactoryId }).select("accountId");
      const facManagerInFactory = await FactoryManager.find({ factory_belong_to: targetFactoryId }).select("accountId");

      const accountIds = [
        ...workersInFactory.map(w => w.accountId),
        ...supervisorInFactory.map(s => s.accountId),
        ...facManagerInFactory.map(f => f.accountId)
      ];
      filter._id = { $in: accountIds };
    }

    const accounts = await Account.find(filter)
      .select("-password")
      .populate("roleId")
      .populate("profileId");

    // Chuẩn hóa format trả về như version cũ
    const users = accounts.map(acc => {
      const profile = acc.profileId as any;
      return {
        _id: acc._id,
        code: acc.code,
        email: acc.email,
        active: acc.active,
        status: acc.status,
        roleId: acc.roleId,
        role: (acc.roleId as any)?.code?.toLowerCase(),
        name: profile?.name,
        dateOfBirth: profile?.dateOfBirth,
        citizenId: profile?.citizenId,
        address: profile?.address,
        factoryId: profile?.factoryId || profile?.factory_belong_to,
        factories_manage: profile?.factory_belong_to,
        createdAt: acc.createdAt,
        updatedAt: acc.updatedAt
      };
    });

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
    const account = await Account.findById(req.params.id)
      .select("-password")
      .populate("roleId")
      .populate("profileId");

    if (!account) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy người dùng" },
      });
      return;
    }

    const profile = account.profileId as any;
    const user = {
      _id: account._id,
      code: account.code,
      email: account.email,
      active: account.active,
      status: account.status,
      roleId: account.roleId,
      role: (account.roleId as any)?.code?.toLowerCase(),
      name: profile?.name,
      dateOfBirth: profile?.dateOfBirth,
      citizenId: profile?.citizenId,
      address: profile?.address,
      factoryId: profile?.factoryId || profile?.factory_belong_to,
      factories_manage: profile?.factory_belong_to,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt
    };

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
    const { code, name, password, roleId, role, factoryId, factories_manage, dateOfBirth, citizenId, address, active, status } = req.body;

    // Check code exists
    if (!code) {
      res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "Mã nhân viên là bắt buộc" } });
      return;
    }

    const existingCode = await Account.findOne({ code });
    if (existingCode) {
      res.status(400).json({
        success: false,
        error: { code: "DUPLICATE", message: "Mã nhân viên đã tồn tại" },
      });
      return;
    }

    // Role logic
    const roleDoc = await Role.findById(roleId);
    if (!roleDoc) {
      res.status(400).json({ success: false, error: { code: "INVALID_ROLE", message: "Vai trò không hợp lệ" } });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || "Aiebike@123", salt);

    // Xây dựng profile data
    let profileModel: "Admin" | "Supervisor" | "Worker" | "FactoryManager" = "Worker";
    let ModelToUse: mongoose.Model<any> = Worker;
    let profileData: any = { name, dateOfBirth, citizenId, address };

    const roleCode = roleDoc.code.toUpperCase();
    if (roleCode === "ADMIN") {
      profileModel = "Admin";
      ModelToUse = Admin;
    } else if (roleCode === "SUPERVISOR") {
      profileModel = "Supervisor";
      ModelToUse = Supervisor;
      profileData.factory_belong_to = factoryId || factories_manage;
    } else if (roleCode === "FAC_MANAGER") {
      profileModel = "FactoryManager";
      ModelToUse = FactoryManager;
      profileData.factory_belong_to = factoryId || factories_manage;
    } else {
      profileData.factoryId = factoryId;
    }

    // Create profile first
    const profile = await ModelToUse.create(profileData);

    // Create account
    const account = await Account.create({
      code,
      password: hashedPassword,
      roleId,
      profileId: profile._id,
      profileModel,
      active: active !== undefined ? active : true,
      status: status || "approved",
    });

    // Link back to profile
    profile.accountId = account._id;
    await profile.save();

    res.status(201).json({
      success: true,
      data: {
        _id: account._id,
        code: account.code,
        name: profile.name,
        role: roleCode.toLowerCase(),
        factoryId: profileData.factoryId || profileData.factory_belong_to,
        factories_manage: profileData.factory_belong_to,
        active: account.active,
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
    const { password, name, dateOfBirth, citizenId, address, factoryId, factories_manage, roleId, active, status } = req.body;

    const account = await Account.findById(req.params.id);

    if (!account) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy người dùng" },
      });
      return;
    }

    // 1. Update Account data
    if (roleId && roleId !== account.roleId.toString()) {
      account.roleId = roleId;
    }
    if (active !== undefined) account.active = active;
    if (status !== undefined) account.status = status;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      account.password = await bcrypt.hash(password, salt);
    }
    await account.save();

    // 2. Update Profile data
    const profileModelType = account.profileModel;
    let ProfileModelToUse;
    let profileUpdate: any = {};
    if (name) profileUpdate.name = name;
    if (dateOfBirth !== undefined) profileUpdate.dateOfBirth = dateOfBirth;
    if (citizenId !== undefined) profileUpdate.citizenId = citizenId;
    if (address !== undefined) profileUpdate.address = address;

    if (profileModelType === "Admin") {
      ProfileModelToUse = Admin;
    } else if (profileModelType === "FactoryManager") {
      ProfileModelToUse = FactoryManager;
      if (factoryId !== undefined || factories_manage !== undefined) profileUpdate.factory_belong_to = factoryId || factories_manage;
    } else if (profileModelType === "Supervisor") {
      ProfileModelToUse = Supervisor;
      if (factoryId !== undefined || factories_manage !== undefined) profileUpdate.factory_belong_to = factoryId || factories_manage;
    } else {
      ProfileModelToUse = Worker;
      if (factoryId !== undefined) profileUpdate.factoryId = factoryId;
    }

    const updatedProfile = await ProfileModelToUse.findOneAndUpdate(
      { accountId: account._id },
      profileUpdate,
      { new: true }
    );

    const fullAccount = await Account.findById(account._id)
      .select("-password")
      .populate("roleId")
      .populate("profileId");

    const profile = fullAccount?.profileId as any;
    const mappedUser = {
      _id: fullAccount?._id,
      code: fullAccount?.code,
      active: fullAccount?.active,
      status: fullAccount?.status,
      roleId: fullAccount?.roleId,
      role: (fullAccount?.roleId as any)?.code?.toLowerCase(),
      name: profile?.name,
      factoryId: profile?.factoryId || profile?.factory_belong_to,
      factories_manage: profile?.factory_belong_to,
    };

    res.json({ success: true, data: mappedUser });
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
    const account = await Account.findById(req.params.id);

    if (!account) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy người dùng" },
      });
      return;
    }

    // Xóa Profile
    const profileModelType = account.profileModel;
    let ProfileModelToUse = Worker; // Default
    if (profileModelType === "Admin") ProfileModelToUse = Admin;
    if (profileModelType === "Supervisor") ProfileModelToUse = Supervisor;

    await ProfileModelToUse.findByIdAndDelete(account.profileId);

    // Xóa Account
    await account.deleteOne();

    res.json({ success: true, message: "Đã xóa người dùng và hồ sơ" });
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

    const account = await Account.findById(req.params.id)
      .select("-password")
      .populate("roleId")
      .populate("profileId");

    if (!account) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy người dùng" },
      });
      return;
    }

    const filter: Record<string, unknown> = { userId: account._id };
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
          _id: account._id,
          code: account.code,
          name: (account.profileId as any)?.name,
          role: (account.roleId as any)?.code?.toLowerCase(),
          roleId: account.roleId,
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
    const accounts = await Account.find({ status: "pending" })
      .select("-password")
      .populate("roleId")
      .populate("profileId")
      .sort({ createdAt: -1 });

    const users = accounts.map(acc => {
      const profile = acc.profileId as any;
      return {
        _id: acc._id,
        code: acc.code,
        email: acc.email,
        active: acc.active,
        status: acc.status,
        roleId: acc.roleId,
        role: (acc.roleId as any)?.code?.toLowerCase(),
        name: profile?.name,
        factoryId: profile?.factoryId || profile?.factory_belong_to,
        createdAt: acc.createdAt,
        updatedAt: acc.updatedAt
      };
    });

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
    const account = await Account.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true },
    ).select("-password");

    if (!account) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy người dùng" },
      });
      return;
    }

    res.json({
      success: true,
      message: "Đã duyệt tài khoản thành công",
      data: account,
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
    const account = await Account.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true },
    ).select("-password");

    if (!account) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy người dùng" },
      });
      return;
    }

    res.json({
      success: true,
      message: "Đã từ chối tài khoản",
      data: account,
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

    // Get all workers in factory
    const accountFilter: any = { profileModel: "Worker", status: "approved" };

    const roleCode = (req.user?.roleId as any)?.code;
    if (roleCode !== "ADMIN" && roleCode !== "admin") {
      const factoryId = req.profile?.factory_belong_to || req.profile?.factoryId;
      const workersInFactory = await Worker.find({ factoryId }).select("accountId");
      accountFilter._id = { $in: workersInFactory.map((w: any) => w.accountId) };
    }

    const accounts = await Account.find(accountFilter)
      .select("_id code")
      .populate("profileId", "name factoryId")
      .lean();

    const workers = accounts.map((acc: any) => ({
      _id: acc._id,
      code: acc.code,
      name: acc.profileId?.name,
      factoryId: acc.profileId?.factoryId,
    }));

    // Get registrations for all workers
    const registrations = await DailyRegistration.find({
      userId: { $in: workers.map((w) => w._id) },
      date: { $gte: start, $lte: end },
      status: "completed",
    })
      .populate("userId", "code") // Chỉ lấy code, name từ map bên dưới
      .lean();

    // Aggregate by worker
    const workerStats: Record<
      string,
      {
        user: { _id: string; code: string; name: string };
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
