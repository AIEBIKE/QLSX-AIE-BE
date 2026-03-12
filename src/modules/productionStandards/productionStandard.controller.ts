import { Response, NextFunction } from "express";
import ProductionStandard from "./productionStandard.model";
import FactoryStandardOverride from "./factoryStandardOverride.model"; // [splinh]
import { AuthRequest } from "../../types";
import { getPaginationParams, formatPaginatedResponse } from "../../shared/utils/pagination";

export const getAll = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { vehicleTypeId, operationId, factoryId, page, limit, search } = req.query as any;
    const filter: Record<string, any> = {};
    if (vehicleTypeId) filter.vehicleTypeId = vehicleTypeId;
    if (operationId) filter.operationId = operationId;

    if (search) {
      filter.description = { $regex: search, $options: "i" };
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

    // Resolve factory for override lookup
    const resolvedFactoryId = factoryId || req.profile?.factory_belong_to || req.profile?.factoryId;

    // [splinh] Merge factory overrides nếu có factoryId
    let mergedStandards: any[] = standards.map((s) => s.toObject());
    if (resolvedFactoryId && standards.length > 0) {
      const standardIds = standards.map((s) => s._id);
      const overrides = await FactoryStandardOverride.find({
        factoryId: resolvedFactoryId,
        standardId: { $in: standardIds },
      });
      const overrideMap = new Map(
        overrides.map((o) => [o.standardId.toString(), o]),
      );
      mergedStandards = standards.map((s) => {
        const obj = s.toObject();
        const override = overrideMap.get(s._id.toString());
        if (override) {
          return {
            ...obj,
            bonusPerUnit: override.bonusPerUnit,
            penaltyPerUnit: override.penaltyPerUnit,
            _hasOverride: true,
          };
        }
        return { ...obj, _hasOverride: false };
      });
    }

    const meta = stats.length > 0 ? {
      maxBonus: stats[0].maxBonus || 0,
      maxPenalty: stats[0].maxPenalty || 0,
    } : { maxBonus: 0, maxPenalty: 0 };

    res.json(formatPaginatedResponse(mergedStandards, total, p, l, meta));
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
    const canManage = roleCode === "fac_manager" || roleCode === "admin";

    if (!canManage) {
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
    const roleCode = (req.user?.roleId as any)?.code?.toLowerCase();
    const canManage = roleCode === "fac_manager" || roleCode === "admin";

    if (!canManage) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Bạn không có quyền chỉnh sửa định mức" },
      });
      return;
    }

    const standard = await ProductionStandard.findById(req.params.id);

    if (!standard) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy tiêu chuẩn" },
      });
      return;
    }

    const { expectedQuantity, bonusPerUnit, penaltyPerUnit, description } = req.body;
    if (expectedQuantity !== undefined) standard.expectedQuantity = expectedQuantity;
    if (bonusPerUnit !== undefined) standard.bonusPerUnit = bonusPerUnit;
    if (penaltyPerUnit !== undefined) standard.penaltyPerUnit = penaltyPerUnit;
    if (description !== undefined) standard.description = description;

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
    const canManage = roleCode === "fac_manager" || roleCode === "admin";

    if (!canManage) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Bạn không có quyền xóa định mức" },
      });
      return;
    }

    const standard = await ProductionStandard.findById(req.params.id);

    if (!standard) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy tiêu chuẩn" },
      });
      return;
    }

    await ProductionStandard.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Đã xóa tiêu chuẩn" });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// [splinh] Factory Override Endpoints
// ==========================================

export const upsertOverride = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const roleCode = (req.user?.roleId as any)?.code?.toLowerCase();
    const isAdmin = roleCode === "admin";
    const isFacManager = roleCode === "fac_manager";

    if (!isAdmin && !isFacManager) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Bạn không có quyền thực hiện thao tác này" },
      });
      return;
    }

    const { standardId, bonusPerUnit, penaltyPerUnit, factoryId: bodyFactoryId } = req.body;

    // FAC_MANAGER can only set overrides for their own factory
    const factoryId = isAdmin && bodyFactoryId
      ? bodyFactoryId
      : req.profile?.factory_belong_to || req.profile?.factoryId;

    if (!factoryId) {
      res.status(400).json({
        success: false,
        error: { code: "MISSING_FACTORY", message: "Không xác định được nhà máy" },
      });
      return;
    }

    if (!standardId) {
      res.status(400).json({
        success: false,
        error: { code: "MISSING_STANDARD", message: "Thiếu standardId" },
      });
      return;
    }

    const override = await FactoryStandardOverride.findOneAndUpdate(
      { factoryId, standardId },
      {
        factoryId,
        standardId,
        bonusPerUnit: bonusPerUnit ?? 0,
        penaltyPerUnit: penaltyPerUnit ?? 0,
      },
      { upsert: true, new: true },
    );

    res.json({ success: true, data: override });
  } catch (error) {
    next(error);
  }
};

export const batchUpsertOverrides = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const roleCode = (req.user?.roleId as any)?.code?.toLowerCase();
    const isAdmin = roleCode === "admin";
    const isFacManager = roleCode === "fac_manager";

    if (!isAdmin && !isFacManager) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Bạn không có quyền thực hiện thao tác này" },
      });
      return;
    }

    const { overrides, factoryId: bodyFactoryId } = req.body;

    const factoryId = isAdmin && bodyFactoryId
      ? bodyFactoryId
      : req.profile?.factory_belong_to || req.profile?.factoryId;

    if (!factoryId) {
      res.status(400).json({
        success: false,
        error: { code: "MISSING_FACTORY", message: "Không xác định được nhà máy" },
      });
      return;
    }

    if (!Array.isArray(overrides) || overrides.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_DATA", message: "Cần truyền mảng overrides" },
      });
      return;
    }

    const bulkOps = overrides.map((o: any) => ({
      updateOne: {
        filter: { factoryId, standardId: o.standardId },
        update: {
          factoryId,
          standardId: o.standardId,
          bonusPerUnit: o.bonusPerUnit ?? 0,
          penaltyPerUnit: o.penaltyPerUnit ?? 0,
        },
        upsert: true,
      },
    }));

    await FactoryStandardOverride.bulkWrite(bulkOps);

    res.json({ success: true, message: `Đã cập nhật ${overrides.length} override(s)` });
  } catch (error) {
    next(error);
  }
};
