import { Router } from "express";
import * as controller from "./productionStandard.controller";
import { auth, adminOnly, facManagerOnly } from "../../shared/middleware";

const router = Router();

router.get("/", auth, controller.getAll);
router.get("/:id", auth, controller.getById);
router.post("/", auth, facManagerOnly, controller.create);
router.put("/:id", auth, facManagerOnly, controller.update);
router.delete("/:id", auth, facManagerOnly, controller.remove);

export default router;
