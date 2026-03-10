import { Router } from "express";
import * as controller from "./registration.controller";
import { auth, adminOnly, adminOrSupervisor } from "../../shared/middleware";

const router = Router();

router.get("/current-order", auth, controller.getCurrentOrder);
router.get("/today", auth, controller.getToday);
router.post("/", auth, controller.create);
router.put("/:id/complete", auth, controller.complete);
router.post("/:id/reassign", auth, adminOrSupervisor, controller.reassign); // Thêm role check cho reassign
router.delete("/:id", auth, controller.remove);

router.get("/admin/all", auth, adminOrSupervisor, controller.adminGetAll);
router.put("/admin/:id/adjust", auth, adminOrSupervisor, controller.adminAdjust);
router.post("/admin/reassign", auth, adminOrSupervisor, controller.adminReassign);

export default router;
