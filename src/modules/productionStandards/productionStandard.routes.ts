import { Router } from "express";
import * as controller from "./productionStandard.controller";
import { auth, adminOnly } from "../../shared/middleware";

const router = Router();

router.get("/", auth, controller.getAll);
router.get("/:id", auth, controller.getById);
router.post("/", auth, adminOnly, controller.create);
router.put("/:id", auth, adminOnly, controller.update);
router.delete("/:id", auth, adminOnly, controller.remove);

export default router;
