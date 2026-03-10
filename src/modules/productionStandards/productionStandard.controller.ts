import { Response, NextFunction } from "express";
import ProductionStandard from "./productionStandard.model";
import { AuthRequest } from "../../types";
import { getPaginationParams, formatPaginatedResponse } from "../../shared/utils/pagination";

export const getAll = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { vehicleTypeId, operationId, page, limit, search } = req.query as any;
    const filter: Record<string, any> = {};
    if (vehicleTypeId) filter.vehicleTypeId = vehicleTypeId;
    if (operationId) filter.operationId = operationId;

    if (search) {
      // ProductionStandard doesn't have a direct 'code' or 'name', usually linked to operation/vehicleType
      // But we can support filtering by description or linked fields if we use aggregation or multiple lookups
      // For now, simple description match if provided
      filter.description = { $regex: search, $options: "i" };
    }

    // Filter by factory for non-admins
    const roleCode = (req.user?.roleId as any)?.code;
    if (roleCode !== "admin" && roleCode !== "ADMIN") {
      filter.factoryId = req.profile?.factory_belong_to || req.profile?.factoryId;
    }

    const { page: p, limit: l, skip } = getPaginationParams({ page, limit });

    const [total, standards, stats] = await Promise.all([
      ProductionStandard.countDocuments(filter),
      ProductionStandard.find(filter)
        .populate("vehicleTypeId", "name code")
        .populate({
          path: "operationId",
          select: "name code processId",
          populate: { path: "processId", select: "name code" },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(l),
      ProductionStandard.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            maxBonus: { $max: { $multiply: ["$bonusPerUnit", "$expectedQuantity"] } },
            maxPenalty: { $max: { $multiply: ["$penaltyPerUnit", "$expectedQuantity"] } },
          },
        },
      ]),
    ]);

    const meta = stats.length > 0 ? {
      maxBonus: stats[0].maxBonus || 0,
      maxPenalty: stats[0].maxPenalty || 0,
    } : { maxBonus: 0, maxPenalty: 0 };

    res.json(formatPaginatedResponse(standards, total, p, l, meta));
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
    const roleCode = (req.user?.roleId as any)?.code?.toLowerCase();
    const isManager = roleCode === "fac_manager";
    const isAdmin = roleCode === "admin";

    // Only allow managers or admins tied to a factory (if any)
    // As per user request, general admin doesn't have right to change factory standards
    if (!isManager && isAdmin) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Admin tổng không có quyền thay đổi định mức của nhà máy" },
      });
      return;
    }

    if (!isManager) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Bạn không có quyền thực hiện thao tác này" },
      });
      return;
    }

    const {
      vehicleTypeId,
      operationId,
      expectedQuantity,
      bonusPerUnit,
      penaltyPerUnit,
      description,
    } = req.body;

    const factoryId = req.profile?.factory_belong_to || req.profile?.factoryId;

    if (!factoryId) {
      res.status(400).json({
        success: false,
        error: { code: "MISSING_FACTORY", message: "Không xác định được nhà máy của bạn" },
      });
      return;
    }

    const existing = await ProductionStandard.findOne({
      vehicleTypeId,
      operationId,
      factoryId,
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
      factoryId,
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
    const roleCode = (req.user?.roleId as any)?.code?.toLowerCase();
    const isManager = roleCode === "fac_manager";
    const isAdmin = roleCode === "admin";

    const standard = await ProductionStandard.findById(req.params.id);

    if (!standard) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy tiêu chuẩn" },
      });
      return;
    }

    // Role check
    if (isAdmin) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Admin tổng không có quyền thay đổi định mức của nhà máy" },
      });
      return;
    }

    const factoryId = req.profile?.factory_belong_to || req.profile?.factoryId;
    if (!isManager || standard.factoryId?.toString() !== factoryId?.toString()) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Bạn không có quyền chỉnh sửa định mức của nhà máy khác" },
      });
      return;
    }

    // Perform update
    Object.assign(standard, req.body);
    // Ensure factoryId is not changed by standard update call
    standard.factoryId = factoryId as any;

    await standard.save();

    const populated = await ProductionStandard.findById(standard._id)
      .populate("vehicleTypeId", "name code")
      .populate("operationId", "name code");

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
    const roleCode = (req.user?.roleId as any)?.code?.toLowerCase();
    const isManager = roleCode === "fac_manager";
    const isAdmin = roleCode === "admin";

    const standard = await ProductionStandard.findById(req.params.id);

    if (!standard) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy tiêu chuẩn" },
      });
      return;
    }

    // Role check
    if (isAdmin) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Admin tổng không có quyền xóa định mức của nhà máy" },
      });
      return;
    }

    const factoryId = req.profile?.factory_belong_to || req.profile?.factoryId;
    if (!isManager || standard.factoryId?.toString() !== factoryId?.toString()) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Bạn không có quyền xóa định mức của nhà máy khác" },
      });
      return;
    }

    await ProductionStandard.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Đã xóa tiêu chuẩn" });
  } catch (error) {
    next(error);
  }
};
