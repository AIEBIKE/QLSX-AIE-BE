import { Router } from "express";
import * as controller from "./qc.controller";
import { auth, adminOrSupervisor } from "../../shared/middleware";

const router = Router();

// Tạo / cập nhật phiếu QC (upsert)
router.post("/inspect", auth, adminOrSupervisor, controller.inspect);

// Danh sách phiếu QC (filter theo ngày / lệnh SX)
router.get("/list", auth, adminOrSupervisor, controller.getList);

// Hoàn thành tất cả phiếu pending
router.post("/complete-all", auth, adminOrSupervisor, controller.completeAll);

// Báo cáo QC theo lệnh sản xuất
router.get("/report/:productionOrderId", auth, adminOrSupervisor, controller.getOrderQCReport);

// Tra cứu theo số khung/máy
router.get("/vehicle", auth, controller.getVehicleQC);

// Chi tiết phiếu QC theo ID
router.get("/:id", auth, adminOrSupervisor, controller.getById);

// Hoàn thành 1 phiếu QC
router.put("/:id/complete", auth, adminOrSupervisor, controller.completeQC);

// Cập nhật phiếu QC
router.put("/:id", auth, adminOrSupervisor, controller.updateQC);

export default router;
