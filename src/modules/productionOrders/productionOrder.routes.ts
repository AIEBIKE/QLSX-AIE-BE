import { Router } from "express";
import * as controller from "./productionOrder.controller";
import { auth, adminOnly, adminOrSupervisor, facManagerOnly } from "../../shared/middleware";

const router = Router();

router.get("/", auth, controller.getAll);
router.get("/active", auth, controller.getActive);
router.get("/:id", auth, controller.getById);
router.get(
  "/:id/check-completion",
  auth,
  adminOrSupervisor, // Keep this as Admin/Supervisor might need to check completion (read-only)
  controller.checkCompletion,
);
router.get("/:id/progress", auth, controller.getProgress);
router.get("/:id/report", auth, controller.getReport);
router.post("/", auth, facManagerOnly, controller.create);
router.post("/:id/complete", auth, facManagerOnly, controller.completeOrder);
router.post("/:id/assign-worker", auth, facManagerOnly, controller.assignWorker);
router.put("/:id", auth, facManagerOnly, controller.update);
router.put("/:id/status", auth, facManagerOnly, controller.updateStatus);
router.delete("/:id", auth, facManagerOnly, controller.remove);

export default router;
