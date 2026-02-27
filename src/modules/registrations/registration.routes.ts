import { Router } from "express";
import * as controller from "./registration.controller";
import { auth, adminOnly } from "../../shared/middleware";

const router = Router();

router.get("/current-order", auth, controller.getCurrentOrder);
router.get("/today", auth, controller.getToday);
router.post("/", auth, controller.create);
router.put("/:id/complete", auth, controller.complete);
router.delete("/:id", auth, controller.remove);

router.get("/admin/all", auth, adminOnly, controller.adminGetAll);
router.put("/admin/:id/adjust", auth, adminOnly, controller.adminAdjust);
router.post("/admin/reassign", auth, adminOnly, controller.adminReassign);

export default router;
