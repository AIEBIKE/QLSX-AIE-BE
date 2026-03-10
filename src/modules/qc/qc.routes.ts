import { Router } from "express";
import * as controller from "./qc.controller";
import { auth, adminOnly, adminOrSupervisor } from "../../shared/middleware";

const router = Router();

// Supervisors and Admins can perform QC
router.post("/inspect", auth, adminOrSupervisor, controller.inspect);

// Get report by production order
router.get("/report/:productionOrderId", auth, adminOrSupervisor, controller.getOrderQCReport);

// Get detail by vehicle
router.get("/vehicle", auth, controller.getVehicleQC);

export default router;
