import { Response, NextFunction } from "express";
import DailyReport from "./dailyReport.model";
import { Shift } from "../shifts";
import { AuthRequest } from "../../types";

export const getShiftSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const shift = await Shift.findOne({
      userId: req.user?._id,
      status: { $in: ["active", "completed"] },
    }).sort({ createdAt: -1 });

    if (!shift) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Không có ca làm việc" },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        shift,
        message: "Use DailyRegistration for new production flow",
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getDaily = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const report = await DailyReport.findOne({
      userId: req.user?._id,
      date: { $gte: targetDate, $lt: nextDate },
    });

    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

export const adminGetWorkers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const reports = await DailyReport.find({
      date: { $gte: targetDate, $lt: nextDate },
    }).populate("userId", "name code department");

    res.json({ success: true, data: reports });
  } catch (error) {
    next(error);
  }
};
