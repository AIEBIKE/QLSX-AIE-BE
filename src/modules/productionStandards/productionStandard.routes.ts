import { Router } from "express";
import * as controller from "./productionStandard.controller";
import { auth, adminOrSupervisor } from "../../shared/middleware";

const router = Router();

router.get("/", auth, controller.getAll);
router.get("/:id", auth, controller.getById);
router.post("/", auth, adminOrSupervisor, controller.create);
router.put("/overrides", auth, adminOrSupervisor, controller.upsertOverride);
router.put("/overrides/batch", auth, adminOrSupervisor, controller.batchUpsertOverrides);
router.put("/:id", auth, adminOrSupervisor, controller.update);
router.delete("/:id", auth, adminOrSupervisor, controller.remove);

export default router;
