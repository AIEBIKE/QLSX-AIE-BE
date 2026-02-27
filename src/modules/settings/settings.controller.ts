import { Response, NextFunction } from "express";
import Settings from "./settings.model";
import { AuthRequest } from "../../types";

export const getBonusRules = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const settings = await Settings.findOne({ key: "bonus_rules" });

    if (!settings) {
      res.json({ success: true, data: Settings.getDefaultBonusRules() });
      return;
    }

    res.json({ success: true, data: settings.value });
  } catch (error) {
    next(error);
  }
};

export const updateBonusRules = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { excellent, good, pass, warning, penalty } = req.body;
    const value = { excellent, good, pass, warning, penalty };

    let settings = await Settings.findOne({ key: "bonus_rules" });

    if (settings) {
      settings.value = value;
      settings.updatedBy = req.user?._id;
      await settings.save();
    } else {
      settings = await Settings.create({
        key: "bonus_rules",
        value,
        description: "Công thức tính thưởng/phạt dựa trên hiệu suất",
        updatedBy: req.user?._id,
      });
    }

    res.json({ success: true, data: settings.value });
  } catch (error) {
    next(error);
  }
};
