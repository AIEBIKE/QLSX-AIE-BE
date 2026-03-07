import { Router } from "express";
import * as controller from "./factory.controller";
import { auth, adminOnly, adminOrSupervisor } from "../../shared/middleware";

const router = Router();

router.get("/", auth, adminOrSupervisor, controller.getAll);
router.post("/", auth, adminOnly, controller.create);
router.put("/:id", auth, adminOnly, controller.update);
router.delete("/:id", auth, adminOnly, controller.remove);

export default router;
