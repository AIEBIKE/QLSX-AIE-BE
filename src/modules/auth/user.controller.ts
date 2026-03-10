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

import { getPaginationParams, formatPaginatedResponse } from "../../shared/utils/pagination";

// Get all users
export const getAll = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { factoryId, role, active, status, search, page, limit } = req.query as any;
    const filter: any = {};
    const requesterRoleCode = (req.user?.roleId as any)?.code?.toUpperCase();
    const isAdmin = requesterRoleCode === "ADMIN";

    let targetFactoryId: any = null;

    if (!isAdmin) {
      targetFactoryId = req.profile?.factory_belong_to || req.profile?.factoryId;
    } else if (factoryId) {
      targetFactoryId = factoryId;
    }

    // Nếu có targetFactoryId thì chỉ lấy user của nhà máy đó
    if (targetFactoryId) {
      // Find worker profiles by factoryId first
      const [workersInFactory, supervisorInFactory, facManagerInFactory] = await Promise.all([
        Worker.find({ factoryId: targetFactoryId }).select("accountId"),
        Supervisor.find({ factory_belong_to: targetFactoryId }).select("accountId"),
        FactoryManager.find({ factory_belong_to: targetFactoryId }).select("accountId"),
      ]);

      const accountIds = [
        ...workersInFactory.map(w => w.accountId),
        ...supervisorInFactory.map(s => s.accountId),
        ...facManagerInFactory.map(f => f.accountId)
      ];
      filter._id = { $in: accountIds };
    }

    // Additional filters
    if (active !== undefined) filter.active = active === "true";
    if (status) filter.status = status;

    // Search by code or name (needs join or multiple steps if name is in profile)
    // For simplicity, we filter by code directly on Account
    if (search) {
      // If we want to search by name as well, we might need a more complex query 
      // or find matching profiles first. Let's do a simple code search first.
      filter.$or = [
        { code: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    const { page: p, limit: l, skip } = getPaginationParams({ page, limit });

    // Role filtering (properly from DB)
    if (role && role !== "all") {
      const roleDoc = await Role.findOne({ code: role.toLowerCase() });
      if (roleDoc) {
        filter.roleId = roleDoc._id;
      } else {
        // If role doesn't exist, return empty
        res.json(formatPaginatedResponse([], 0, p, l));
        return;
      }
    }

    const [total, accounts, stats] = await Promise.all([
      Account.countDocuments(filter),
      Account.find(filter)
        .select("-password")
        .populate("roleId")
        .populate("profileId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(l),
      Account.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: ["$active", 1, 0] } },
          },
        },
      ]),
    ]);

    // Role stats are harder because Account only has roleId (ObjectId)
    // We could do a more complex aggregation with $lookup or separate count calls
    // For now, let's just get the main totals.
    const meta = stats.length > 0 ? {
      total: stats[0].total,
      active: stats[0].active,
      inactive: stats[0].total - stats[0].active,
    } : { total: 0, active: 0, inactive: 0 };

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
        phoneNumber: profile?.phoneNumber,
        factoryId: profile?.factoryId || profile?.factory_belong_to,
      };
    });

    res.json(formatPaginatedResponse(users, total, p, l, meta));
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
    let roleDoc = null;
    if (roleId && mongoose.Types.ObjectId.isValid(roleId)) {
      roleDoc = await Role.findById(roleId);
    }

    if (!roleDoc && role) {
      roleDoc = await Role.findOne({ code: role.toUpperCase() });
    }

    if (!roleDoc) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_ROLE",
          message: `Vai trò không hợp lệ (roleId: ${roleId}, role: ${role})`
        }
      });
      return;
    }

    const resolvedRoleId = roleDoc._id;

    // Generate account ID first since it's required by profile
    const accountId = new mongoose.Types.ObjectId();

    // Use raw password, Account model pre-save hook will handle hashing
    const accountPassword = password || "123456";

    // Xây dựng profile data
    let profileModel: "Admin" | "Supervisor" | "Worker" | "FactoryManager" = "Worker";
    let ModelToUse: mongoose.Model<any> = Worker;
    let profileData: any = { accountId, name, dateOfBirth, citizenId, address };

    const roleCode = roleDoc.code.toUpperCase();

    // Tự động gán nhà máy nếu người tạo không phải Admin
    const creatorRoleCode = (req.user?.roleId as any)?.code?.toUpperCase();
    const isCreatorAdmin = creatorRoleCode === "ADMIN";
    const creatorFactoryId = req.profile?.factory_belong_to || req.profile?.factoryId;

    if (roleCode === "ADMIN") {
      profileModel = "Admin";
      ModelToUse = Admin;
    } else if (roleCode === "SUPERVISOR") {
      profileModel = "Supervisor";
      ModelToUse = Supervisor;
      profileData.factory_belong_to = factoryId || factories_manage || (!isCreatorAdmin ? creatorFactoryId : undefined);
    } else if (roleCode === "FAC_MANAGER") {
      profileModel = "FactoryManager";
      ModelToUse = FactoryManager;
      profileData.factory_belong_to = factoryId || factories_manage || (!isCreatorAdmin ? creatorFactoryId : undefined);
    } else {
      profileData.factoryId = factoryId || (!isCreatorAdmin ? creatorFactoryId : undefined);
    }

    // Create profile first
    const profile = await ModelToUse.create(profileData);

    // Create account
    const account = await Account.create({
      _id: accountId,
      code,
      password: accountPassword,
      roleId: resolvedRoleId,
      profileId: profile._id,
      profileModel,
      active: active !== undefined ? active : true,
      status: status || "approved",
    });

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
    const { password, name, dateOfBirth, citizenId, address, factoryId, factories_manage, roleId, role, active, status } = req.body;

    const account = await Account.findById(req.params.id);

    if (!account) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy người dùng" },
      });
      return;
    }

    // 1. Update Account data
    let oldProfileModelType = account.profileModel;
    let oldProfileId = account.profileId;
    let newProfileModelType = oldProfileModelType;
    let newRoleId = account.roleId;

    // Resolve Role
    let roleDoc = null;
    if (roleId || role) {
      if (roleId && mongoose.Types.ObjectId.isValid(roleId)) {
        roleDoc = await Role.findById(roleId);
      }
      if (!roleDoc && role) {
        roleDoc = await Role.findOne({ code: role.toUpperCase() });
      }

      if (!roleDoc) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_ROLE",
            message: `Vai trò không hợp lệ (roleId: ${roleId}, role: ${role})`
          }
        });
        return;
      }
    }

    if (roleDoc && roleDoc._id.toString() !== account.roleId.toString()) {
      account.roleId = roleDoc._id;
      newRoleId = roleDoc._id;

      const roleCode = roleDoc.code.toUpperCase();
      if (roleCode === "ADMIN") {
        newProfileModelType = "Admin";
      } else if (roleCode === "SUPERVISOR") {
        newProfileModelType = "Supervisor";
      } else if (roleCode === "FAC_MANAGER") {
        newProfileModelType = "FactoryManager";
      } else {
        newProfileModelType = "Worker";
      }
    }

    if (active !== undefined) account.active = active;
    if (status !== undefined) account.status = status;
    // 2. Update password if provided
    if (password) {
      account.password = password;
    }

    // 2. Profile Migration Logic
    if (oldProfileModelType !== newProfileModelType) {
      // Get Old Model
      let OldModel: mongoose.Model<any> = Worker;
      if (oldProfileModelType === "Admin") OldModel = Admin;
      else if (oldProfileModelType === "FactoryManager") OldModel = FactoryManager;
      else if (oldProfileModelType === "Supervisor") OldModel = Supervisor;

      // Extract existing data
      const oldProfileData = await OldModel.findById(oldProfileId);

      let baseData = {
        name: oldProfileData?.name || name || "User",
        dateOfBirth: oldProfileData?.dateOfBirth || dateOfBirth,
        citizenId: oldProfileData?.citizenId || citizenId,
        address: oldProfileData?.address || address,
        factoryId: undefined as any,
        factory_belong_to: undefined as any
      };

      // Extract factory mapping robustly
      const existingFactoryId = oldProfileData?.factoryId || oldProfileData?.factory_belong_to;
      const finalFactoryId = factoryId || factories_manage || existingFactoryId;

      // Delete old profile
      if (oldProfileId) {
        await OldModel.findByIdAndDelete(oldProfileId);
      }

      // Configure New Model
      let NewModel: mongoose.Model<any> = Worker;
      if (newProfileModelType === "Admin") NewModel = Admin;
      else if (newProfileModelType === "FactoryManager") {
        NewModel = FactoryManager;
        baseData.factory_belong_to = finalFactoryId;
      }
      else if (newProfileModelType === "Supervisor") {
        NewModel = Supervisor;
        baseData.factory_belong_to = finalFactoryId;
      }
      else {
        baseData.factoryId = finalFactoryId;
      }

      // Merge explicitly requested updates
      if (name) baseData.name = name;
      if (dateOfBirth !== undefined) baseData.dateOfBirth = dateOfBirth;
      if (citizenId !== undefined) baseData.citizenId = citizenId;
      if (address !== undefined) baseData.address = address;

      // Create new profile
      const newProfile = await NewModel.create({
        ...baseData,
        accountId: account._id
      });

      // Link to account
      account.profileId = newProfile._id;
      account.profileModel = newProfileModelType;
      await account.save();
    } else {
      await account.save();
      // Regular in-place update if role didn't change schema
      let ProfileModelToUse: mongoose.Model<any> = Worker;
      let profileUpdate: any = {};
      if (name) profileUpdate.name = name;
      if (dateOfBirth !== undefined) profileUpdate.dateOfBirth = dateOfBirth;
      if (citizenId !== undefined) profileUpdate.citizenId = citizenId;
      if (address !== undefined) profileUpdate.address = address;

      if (newProfileModelType === "Admin") {
        ProfileModelToUse = Admin;
      } else if (newProfileModelType === "FactoryManager") {
        ProfileModelToUse = FactoryManager;
        if (factoryId !== undefined || factories_manage !== undefined) profileUpdate.factory_belong_to = factoryId || factories_manage;
      } else if (newProfileModelType === "Supervisor") {
        ProfileModelToUse = Supervisor;
        if (factoryId !== undefined || factories_manage !== undefined) profileUpdate.factory_belong_to = factoryId || factories_manage;
      } else {
        ProfileModelToUse = Worker;
        if (factoryId !== undefined) profileUpdate.factoryId = factoryId;
      }

      await ProfileModelToUse.findOneAndUpdate(
        { accountId: account._id },
        profileUpdate,
        { new: true }
      );
    }

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
    const { startDate, endDate, productionOrderId, page, limit } = req.query as any;
    const { page: p, limit: l, skip } = getPaginationParams({ page, limit });

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

    const [total, allRegistrations, paginatedRegistrations] = await Promise.all([
      DailyRegistration.countDocuments(filter),
      DailyRegistration.find(filter).lean(),
      DailyRegistration.find(filter)
        .populate({
          path: "operationId",
          select: "name code processId",
          populate: { path: "processId", select: "name code" },
        })
        .populate("productionOrderId", "orderCode vehicleTypeId status")
        .populate("shiftId", "date startTime endTime")
        .sort({ date: -1 })
        .skip(skip)
        .limit(l),
    ]);

    // Tính thống kê từ allRegistrations (cho toàn bộ lịch sử trong range)
    const stats = {
      totalRegistrations: allRegistrations.length,
      totalCompleted: allRegistrations.filter((r) => r.status === "completed")
        .length,
      totalQuantity: allRegistrations.reduce(
        (sum, r) => sum + (r.actualQuantity || 0),
        0,
      ),
      totalWorkingMinutes: allRegistrations.reduce(
        (sum, r) => sum + (r.workingMinutes || 0),
        0,
      ),
      totalBonus: allRegistrations.reduce(
        (sum, r) => sum + (r.bonusAmount || 0),
        0,
      ),
      totalPenalty: allRegistrations.reduce(
        (sum, r) => sum + (r.penaltyAmount || 0),
        0,
      ),
      averageDeviation:
        allRegistrations.length > 0
          ? allRegistrations.reduce((sum, r) => sum + ((r as any).deviation || 0), 0) /
          allRegistrations.length
          : 0,
    };

    res.json(
      formatPaginatedResponse(paginatedRegistrations, total, p, l, {
        user: {
          _id: account._id,
          code: account.code,
          name: (account.profileId as any)?.name,
          role: (account.roleId as any)?.code?.toLowerCase(),
          roleId: account.roleId,
        },
        statistics: stats,
      }),
    );
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
    const { period, startDate, endDate, page, limit } = req.query as any;
    let start: Date;
    let end: Date = new Date();
    const { page: p, limit: l, skip } = getPaginationParams({ page, limit });

    // Calculate date range based on period
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

    const sortedWorkers = Object.values(workerStats).sort(
      (a, b) => b.totalNetIncome - a.totalNetIncome,
    );

    const paginatedWorkers = sortedWorkers.slice(skip, skip + l);

    res.json(
      formatPaginatedResponse(paginatedWorkers, sortedWorkers.length, p, l, {
        summary,
        chartData: Object.values(dailyData).sort((a, b) =>
          a.date.localeCompare(b.date),
        ),
        dateRange: { start, end },
      }),
    );
  } catch (error) {
    next(error);
  }
};
