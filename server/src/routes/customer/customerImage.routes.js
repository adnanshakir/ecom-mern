import express from "express";
import { uploadCustomerImage } from "../../controllers/customer/customerImage.controller.js";
import { authenticateCustomer } from "../../middleware/authenticateCustomer.middleware.js";
import { upload } from "../../middleware/upload.middleware.js";

const router = express.Router();

/**
 * @route   POST /api/customers/images/upload
 * @desc    Upload images for customer use (reviews, etc.) — max 4 files
 * @access  Private (authenticateCustomer)
 */
router.post(
  "/upload",
  authenticateCustomer,
  upload.array("image", 4),
  uploadCustomerImage
);

export default router;
