import { Router } from "express";
import * as controller from "./settings.controller";
import { auth, adminOnly } from "../../shared/middleware";

const router = Router();

router.get("/bonus-rules", auth, controller.getBonusRules);
router.put("/bonus-rules", auth, adminOnly, controller.updateBonusRules);

export default router;
