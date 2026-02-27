import { Response, NextFunction } from "express";
import Shift from "./shift.model";
import { AuthRequest } from "../../types";

export const start = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingShift = await Shift.findOne({
      userId: req.user?._id,
      date: { $gte: today },
      status: "active",
    });

    if (existingShift) {
      res.status(400).json({
        success: false,
        error: {
          code: "SHIFT_EXISTS",
          message: "Đã có ca làm việc đang hoạt động",
        },
      });
      return;
    }

    const shift = await Shift.create({
      userId: req.user?._id,
      date: today,
      startTime: new Date(),
      status: "active",
    });

    res.status(201).json({ success: true, data: shift });
  } catch (error) {
    next(error);
  }
};

export const end = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const shift = await Shift.findOne({
      userId: req.user?._id,
      status: "active",
    });

    if (!shift) {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Không có ca làm việc đang hoạt động",
        },
      });
      return;
    }

    const endTime = new Date();
    const totalMinutes = Math.round(
      (endTime.getTime() - shift.startTime.getTime()) / (1000 * 60),
    );

    shift.endTime = endTime;
    shift.totalWorkingMinutes = totalMinutes;
    shift.status = "completed";
    await shift.save();

    res.json({ success: true, data: shift });
  } catch (error) {
    next(error);
  }
};

export const getCurrent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const shift = await Shift.findOne({
      userId: req.user?._id,
      status: "active",
    });

    res.json({ success: true, data: shift });
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { from, to, limit = "10", page = "1" } = req.query;
    const filter: Record<string, unknown> = { userId: req.user?._id };

    if (from || to) {
      filter.date = {};
      if (from)
        (filter.date as Record<string, Date>).$gte = new Date(from as string);
      if (to)
        (filter.date as Record<string, Date>).$lte = new Date(to as string);
    }

    const shifts = await Shift.find(filter)
      .sort({ date: -1 })
      .limit(parseInt(limit as string))
      .skip((parseInt(page as string) - 1) * parseInt(limit as string));

    const total = await Shift.countDocuments(filter);

    res.json({
      success: true,
      data: shifts,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    next(error);
  }
};
