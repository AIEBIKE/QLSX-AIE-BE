import { Router } from "express";
import * as controller from "./productionOrder.controller";
import { auth, adminOnly } from "../../shared/middleware";

const router = Router();

router.get("/", auth, controller.getAll);
router.get("/active", auth, controller.getActive);
router.get("/:id", auth, controller.getById);
router.get(
  "/:id/check-completion",
  auth,
  adminOnly,
  controller.checkCompletion,
);
router.get("/:id/progress", auth, controller.getProgress);
router.get("/:id/report", auth, controller.getReport);
router.post("/", auth, adminOnly, controller.create);
router.post("/:id/complete", auth, adminOnly, controller.completeOrder);
router.post("/:id/assign-worker", auth, adminOnly, controller.assignWorker);
router.put("/:id", auth, adminOnly, controller.update);
router.put("/:id/status", auth, adminOnly, controller.updateStatus);
router.delete("/:id", auth, adminOnly, controller.remove);

export default router;
