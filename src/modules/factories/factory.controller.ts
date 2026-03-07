import { Response, NextFunction } from "express";
import Factory from "./factory.model";
import { AuthRequest } from "../../types";

// Get all factories
export const getAll = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { active } = req.query;
        const filter: any = {};
        if (active !== undefined) filter.active = active === "true";

        const factories = await Factory.find(filter).sort({ name: 1 });
        res.json({ success: true, data: factories, count: factories.length });
    } catch (error) {
        next(error);
    }
};

// Create new factory
export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const factory = await Factory.create(req.body);
        res.status(201).json({ success: true, data: factory });
    } catch (error) {
        next(error);
    }
};

// Update factory
export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const factory = await Factory.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!factory) {
            return res.status(404).json({ success: false, error: { message: "Không tìm thấy nhà máy" } });
        }
        res.json({ success: true, data: factory });
    } catch (error) {
        next(error);
    }
};

// Delete factory (soft delete)
export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const factory = await Factory.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
        if (!factory) {
            return res.status(404).json({ success: false, error: { message: "Không tìm thấy nhà máy" } });
        }
        res.json({ success: true, message: "Đã xóa nhà máy" });
    } catch (error) {
        next(error);
    }
};
