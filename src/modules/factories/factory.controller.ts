import Factory from "./factory.model";
import { asyncHandler } from "../../shared/utils/asyncHandler";

// Get all factories
export const getAll = asyncHandler(async (req, res) => {
  const { active } = req.query;
  const filter: any = {};
  if (active !== undefined) filter.active = active === "true";

  const factories = await Factory.find(filter).sort({ name: 1 });
  res.json({ success: true, data: factories, count: factories.length });
});

// Create new factory
export const create = asyncHandler(async (req, res) => {
  const factory = await Factory.create(req.body);
  res.status(201).json({ success: true, data: factory });
});

// Update factory
export const update = asyncHandler(async (req, res) => {
  const factory = await Factory.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!factory) {
    return res
      .status(404)
      .json({ success: false, error: { message: "Không tìm thấy nhà máy" } });
  }
  res.json({ success: true, data: factory });
});

// Delete factory (soft delete)
export const remove = asyncHandler(async (req, res) => {
  const factory = await Factory.findByIdAndUpdate(
    req.params.id,
    { active: false },
    { new: true },
  );
  if (!factory) {
    return res
      .status(404)
      .json({ success: false, error: { message: "Không tìm thấy nhà máy" } });
  }
  res.json({ success: true, message: "Đã xóa nhà máy" });
});
