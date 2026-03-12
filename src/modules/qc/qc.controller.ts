import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import QualityControl from "./qualityControl.model";
import ProductionOrder from "../productionOrders/productionOrder.model";
import Operation from "../operations/operation.model";
import { AuthRequest } from "../../types";

// ──────────────────────────────────────────────
// POST /api/qc/inspect  — Tạo / cập nhật phiếu
// ──────────────────────────────────────────────
export const inspect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const {
            productionOrderId,
            frameNumber,
            engineNumber,
            color,
            inspectionDate,
            results,
        } = req.body;
        const inspectorId = req.user?._id;

        if (!frameNumber) {
            return res
                .status(400)
                .json({ success: false, error: { message: "Số khung là bắt buộc" } });
        }

        // Kiểm tra lệnh sản xuất tồn tại
        const order = await ProductionOrder.findById(productionOrderId);
        if (!order) {
            return res
                .status(404)
                .json({ success: false, error: { message: "Không tìm thấy lệnh sản xuất" } });
        }

        // Enrich results với operationName & processId/processName
        const enrichedResults = await Promise.all(
            (results || []).map(async (r: any) => {
                let operationName = r.operationName || "";
                let processId = r.processId || null;
                let processName = r.processName || "";

                if (!operationName && r.operationId) {
                    const op = await Operation.findById(r.operationId).populate(
                        "processId",
                        "name"
                    );
                    if (op) {
                        operationName = op.name;
                        if (op.processId && typeof op.processId === "object") {
                            processId = (op.processId as any)._id;
                            processName = (op.processId as any).name || "";
                        }
                    }
                }

                return {
                    operationId: r.operationId,
                    operationName,
                    processId,
                    processName,
                    status: r.status || "pass",
                    note: r.note || "",
                };
            })
        );

        const hasFail = enrichedResults.some((r: any) => r.status === "fail");

        const qc = await QualityControl.findOneAndUpdate(
            { productionOrderId, frameNumber, engineNumber },
            {
                color,
                inspectionDate: inspectionDate ? new Date(inspectionDate) : new Date(),
                results: enrichedResults,
                inspectorId,
                status: "pending", // Mặc định chờ kiểm duyệt
            },
            { upsert: true, new: true }
        );

        res.json({ success: true, data: qc });
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────
// GET /api/qc/list  — Danh sách phiếu QC
// Params: ?date=YYYY-MM-DD &productionOrderId= &page= &limit=
// ──────────────────────────────────────────────
export const getList = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const {
            date,
            productionOrderId,
            page = "1",
            limit = "20",
            status,
        } = req.query as Record<string, string>;

        const filter: Record<string, any> = {};

        if (productionOrderId) {
            filter.productionOrderId = productionOrderId;
        }

        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            filter.inspectionDate = { $gte: start, $lte: end };
        }

        if (status) {
            filter.status = status;
        }

        // Giám sát / FAC_MANAGER chỉ thấy phiếu thuộc nhà máy của mình
        const roleCode = (req.user?.roleId as any)?.code || (req.user as any)?.role;
        if (roleCode !== "ADMIN" && roleCode !== "admin") {
            const factoryId = (req.profile as any)?.factory_belong_to || (req.profile as any)?.factoryId;
            if (factoryId) {
                // Tìm tất cả lệnh SX của nhà máy này
                const orderIds = await ProductionOrder.distinct("_id", { factoryId });
                // Nếu client đã lọc theo 1 lệnh cụ thể, giao nhau với nhà máy
                if (filter.productionOrderId) {
                    const inFactory = orderIds.some(
                        (oid: any) => oid.toString() === filter.productionOrderId.toString()
                    );
                    if (!inFactory) {
                        // Lệnh đó không thuộc nhà máy → trả về rỗng
                        return res.json({
                            success: true,
                            data: [],
                            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
                        });
                    }
                } else {
                    filter.productionOrderId = { $in: orderIds };
                }
            }
        }

        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 20;
        const skip = (pageNum - 1) * limitNum;

        const [records, total] = await Promise.all([
            QualityControl.find(filter)
                .populate("productionOrderId", "orderCode name vehicleTypeId")
                .populate("inspectorId", "name code")
                .sort({ inspectionDate: -1, createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            QualityControl.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: records,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────
// GET /api/qc/report/:productionOrderId
// ──────────────────────────────────────────────
export const getOrderQCReport = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const { productionOrderId } = req.params;
        const records = await QualityControl.find({ productionOrderId })
            .populate("inspectorId", "name code")
            .populate("results.operationId", "name code");

        res.json({ success: true, data: records, count: records.length });
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────
// GET /api/qc/:id  — Chi tiết phiếu
// ──────────────────────────────────────────────
export const getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const record = await QualityControl.findById(req.params.id)
            .populate("productionOrderId", "orderCode name vehicleTypeId frameNumbers engineNumbers")
            .populate("inspectorId", "name code")
            .populate("results.operationId", "name code");

        if (!record) {
            return res
                .status(404)
                .json({ success: false, error: { message: "Không tìm thấy phiếu QC" } });
        }

        res.json({ success: true, data: record });
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────
// PUT /api/qc/:id  — Sửa phiếu
// ──────────────────────────────────────────────
export const updateQC = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { color, inspectionDate, results } = req.body;

        // Enrich results
        const enrichedResults = await Promise.all(
            (results || []).map(async (r: any) => {
                let operationName = r.operationName || "";
                let processId = r.processId || null;
                let processName = r.processName || "";

                if (!operationName && r.operationId) {
                    const op = await Operation.findById(r.operationId).populate(
                        "processId",
                        "name"
                    );
                    if (op) {
                        operationName = op.name;
                        if (op.processId && typeof op.processId === "object") {
                            processId = (op.processId as any)._id;
                            processName = (op.processId as any).name || "";
                        }
                    }
                }

                return {
                    operationId: r.operationId,
                    operationName: operationName || r.operationName,
                    processId: processId || r.processId,
                    processName: processName || r.processName,
                    status: r.status || "pass",
                    note: r.note || "",
                };
            })
        );

        const hasFail = enrichedResults.some((r: any) => r.status === "fail");

        const updated = await QualityControl.findByIdAndUpdate(
            req.params.id,
            {
                color,
                inspectionDate: inspectionDate ? new Date(inspectionDate) : undefined,
                results: enrichedResults,
                status: hasFail ? "failed" : "passed",
            },
            { new: true, runValidators: true }
        )
            .populate("productionOrderId", "orderCode name vehicleTypeId")
            .populate("inspectorId", "name code");

        if (!updated) {
            return res
                .status(404)
                .json({ success: false, error: { message: "Không tìm thấy phiếu QC" } });
        }

        res.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────
// GET /api/qc/vehicle  — Tra cứu theo số khung/máy
// ──────────────────────────────────────────────
export const getVehicleQC = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const { frameNumber, engineNumber } = req.query;
        const record = await QualityControl.findOne({ frameNumber, engineNumber })
            .populate("inspectorId", "name code")
            .populate("results.operationId", "name code");

        if (!record) {
            return res
                .status(404)
                .json({
                    success: false,
                    error: { message: "Không tìm thấy dữ liệu QC của xe này" },
                });
        }

        res.json({ success: true, data: record });
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────
// PUT /api/qc/:id/complete  — Hoàn thành 1 phiếu
// ──────────────────────────────────────────────
export const completeQC = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const record = await QualityControl.findById(req.params.id);
        if (!record) {
            return res.status(404).json({ success: false, error: { message: "Không tìm thấy phiếu QC" } });
        }

        const hasFail = (record.results || []).some((r: any) => r.status === "fail");
        record.status = hasFail ? "failed" : "passed";
        await record.save();

        res.json({ success: true, data: record });
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────
// POST /api/qc/complete-all  — Hoàn thành tất cả phiếu pending
// Body: { productionOrderId? }
// ──────────────────────────────────────────────
export const completeAll = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { productionOrderId } = req.body;
        const filter: Record<string, any> = { status: "pending" };

        // Giới hạn theo nhà máy của user
        const roleCode = (req.user?.roleId as any)?.code || (req.user as any)?.role;
        if (roleCode !== "ADMIN" && roleCode !== "admin") {
            const factoryId = (req.profile as any)?.factory_belong_to || (req.profile as any)?.factoryId;
            if (factoryId) {
                const orderIds = await ProductionOrder.distinct("_id", { factoryId });
                filter.productionOrderId = { $in: orderIds };
            }
        }

        // Nếu có lọc thêm theo lệnh SX cụ thể
        if (productionOrderId) {
            filter.productionOrderId = productionOrderId;
        }

        const pendingRecords = await QualityControl.find(filter);

        const updates = pendingRecords.map((record) => {
            const hasFail = (record.results || []).some((r: any) => r.status === "fail");
            return QualityControl.findByIdAndUpdate(
                record._id,
                { status: hasFail ? "failed" : "passed" },
                { new: true }
            );
        });

        const updated = await Promise.all(updates);

        res.json({
            success: true,
            data: updated,
            message: `Đã hoàn thành ${updated.length} phiếu kiểm duyệt`,
        });
    } catch (error) {
        next(error);
    }
};
