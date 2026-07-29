import express from "express";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import { createCategorySchema, updateCategorySchema } from "../validations/product.validation.js";

const router = express.Router();

router.get("/", authenticate, getCategories);
router.get("/:id", authenticate, getCategoryById);
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin"),
  validate(createCategorySchema),
  createCategory
);
router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "admin"),
  validate(updateCategorySchema),
  updateCategory
);
router.delete("/:id", authenticate, authorize("super_admin", "admin"), deleteCategory);

export default router;
