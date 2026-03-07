import { Response, NextFunction } from "express";
import QualityControl from "./qualityControl.model";
import ProductionOrder from "../productionOrders/productionOrder.model";
import { AuthRequest } from "../../types";

// Ghi nhận kết quả kiểm tra QC
export const inspect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { productionOrderId, frameNumber, engineNumber, color, results } = req.body;
        const inspectorId = req.user?._id;

        // Kiểm tra lệnh sản xuất tồn tại
        const order = await ProductionOrder.findById(productionOrderId);
        if (!order) {
            return res.status(404).json({ success: false, error: { message: "Không tìm thấy lệnh sản xuất" } });
        }

        // Tạo hoặc cập nhật bản ghi QC cho chiếc xe này
        const qc = await QualityControl.findOneAndUpdate(
            { productionOrderId, frameNumber, engineNumber },
            {
                color,
                results,
                inspectorId,
                inspectionDate: new Date(),
                status: results.some((r: any) => r.status === "fail") ? "failed" : "passed",
            },
            { upsert: true, new: true }
        );

        res.json({ success: true, data: qc });
    } catch (error) {
        next(error);
    }
};

// Lấy báo cáo QC của một lệnh sản xuất
export const getOrderQCReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
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

// Lấy chi tiết QC của một chiếc xe
export const getVehicleQC = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { frameNumber, engineNumber } = req.query;
        const record = await QualityControl.findOne({ frameNumber, engineNumber })
            .populate("inspectorId", "name code")
            .populate("results.operationId", "name code");

        if (!record) {
            return res.status(404).json({ success: false, error: { message: "Không tìm thấy dữ liệu QC của xe này" } });
        }

        res.json({ success: true, data: record });
    } catch (error) {
        next(error);
    }
};
