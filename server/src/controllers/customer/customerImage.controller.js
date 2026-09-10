import imagekit from "../../utils/imagekit.js";
import ApiError from "../../utils/apiError.js";

/**
 * Upload images for customer use (reviews, profile, etc.)
 * Reuses the same ImageKit infrastructure as admin uploads,
 * but stores files in a separate folder for isolation.
 *
 * Uses Promise.allSettled so that if any upload fails, we clean up
 * all successfully uploaded files to prevent orphaned assets.
 */
export const uploadCustomerImage = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      throw new ApiError(400, "No image files provided");
    }

    const results = await Promise.allSettled(
      req.files.map((file) =>
        imagekit.upload({
          file: file.buffer.toString("base64"),
          fileName: file.originalname,
          folder: "/ecommerce/reviews",
        })
      )
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // If any upload failed, clean up all successful ones and forward the error
    if (rejected.length > 0) {
      // Best-effort cleanup — don't let cleanup failures mask the original error
      await Promise.allSettled(
        fulfilled
          .filter((r) => r.value?.fileId)
          .map((r) => imagekit.deleteFile(r.value.fileId))
      );

      const firstError = rejected[0].reason;
      throw new ApiError(
        500,
        firstError?.message || "One or more image uploads failed"
      );
    }

    res.status(201).json({
      success: true,
      data: fulfilled.map((r) => ({
        url: r.value.url,
        fileId: r.value.fileId,
        name: r.value.name,
      })),
    });
  } catch (err) {
    next(err);
  }
};
