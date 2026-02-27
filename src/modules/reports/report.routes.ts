import { Router } from "express";
import * as controller from "./report.controller";
import { auth, adminOrSupervisor } from "../../shared/middleware";

const router = Router();

router.get("/shift-summary", auth, controller.getShiftSummary);
router.get("/daily", auth, controller.getDaily);
router.get(
  "/admin/workers",
  auth,
  adminOrSupervisor,
  controller.adminGetWorkers,
);

export default router;
