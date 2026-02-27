import { Router } from "express";
import * as controller from "./shift.controller";
import { auth } from "../../shared/middleware";

const router = Router();

router.post("/start", auth, controller.start);
router.put("/end", auth, controller.end);
router.get("/current", auth, controller.getCurrent);
router.get("/history", auth, controller.getHistory);

export default router;
