import imagekit from "../utils/imagekit.js";
import ApiError from "../utils/apiError.utils.js";

export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, "No image file provided");
    }

    const result = await imagekit.upload({
      file: req.file.buffer.toString("base64"),
      fileName: req.file.originalname,
      folder: "/ecommerce-admin/products",
    });

    res.status(201).json({
      success: true,
      data: {
        url: result.url,
        fileId: result.fileId,
        name: result.name,
      },
    });
  } catch (err) {
    next(err);
  }
};