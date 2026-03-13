import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../services/cloudinary.service";
import { AuthRequest } from "../../types";

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req: AuthRequest, file) => {
    return {
      folder: "aiebike/avatars",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      // Use the user code or unique ID for the filename to prevent collision and allow easy identification
      public_id: `avatar_${req.user?._id || Date.now()}`,
      transformation: [{ width: 300, height: 300, crop: "fill", gravity: "face" }],
    };
  },
});

export const uploadAvatar = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
}).single("avatar");
