import { Router, Response, NextFunction } from "express";
import { AuthRequest } from "../../types";
import { auth } from "../../shared/middleware";

const router = Router();

// LEGACY ROUTES - Use DailyRegistration for new production flow
router.get(
  "/current",
  auth,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      res.json({
        success: true,
        data: [],
        message: "Legacy: Use /api/registrations/today for new flow",
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
