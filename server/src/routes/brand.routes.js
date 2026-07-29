import express from "express";
import {
  createBrand,
  getBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
} from "../controllers/brand.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import { createBrandSchema, updateBrandSchema } from "../validations/product.validation.js";

const router = express.Router();

router.get("/", authenticate, getBrands);
router.get("/:id", authenticate, getBrandById);
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin"),
  validate(createBrandSchema),
  createBrand
);
router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "admin"),
  validate(updateBrandSchema),
  updateBrand
);
router.delete("/:id", authenticate, authorize("super_admin", "admin"), deleteBrand);

export default router;
