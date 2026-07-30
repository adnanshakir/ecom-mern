import express from "express";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller.js";
import {
  createVariant,
  getVariantsByProduct,
  getVariantById,
  updateVariant,
  deleteVariant,
} from "../controllers/productVariant.controller.js";
import {
  createProductSchema,
  updateProductSchema,
  createVariantSchema,
  updateVariantSchema,
  nestedCreateVariantSchema
} from "../validations/product.validation.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { validate } from "../middleware/validate.js";
import { authorize } from "../middleware/authorize.js";
import { previewCsvImport, confirmCsvImport, rollbackCsvImport } from "../controllers/csvImport.controller.js";
import { csvUpload } from "../middleware/csvUpload.js";

const router = express.Router();

// ---- Product ----
router.get("/", authenticate, getProducts);
router.post(
  "/import/preview",
  authenticate,
  authorize("super_admin", "admin"),
  csvUpload.single("file"),
  previewCsvImport
);
router.get("/:id", authenticate, getProductById);
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin"),
  validate(createProductSchema),
  createProduct
);
router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "admin"),
  validate(updateProductSchema),
  updateProduct
);
router.delete("/:id", authenticate, authorize("super_admin", "admin"), deleteProduct);

// ---- Variants (nested under a product) ----
router.get("/:productId/variants", authenticate, getVariantsByProduct);
router.get("/:productId/variants/:id", authenticate, getVariantById);
router.post(
  "/:productId/variants",
  authenticate,
  authorize("super_admin", "admin"),
  validate(nestedCreateVariantSchema),
  createVariant
);
router.put(
  "/:productId/variants/:id",
  authenticate,
  authorize("super_admin", "admin"),
  validate(updateVariantSchema),
  updateVariant
);
router.delete(
  "/:productId/variants/:id",
  authenticate,
  authorize("super_admin", "admin"),
  deleteVariant
);

// Csv import confirmation endpoint
router.post(
  "/import/confirm",
  authenticate,
  authorize("super_admin", "admin"),
  confirmCsvImport
);

router.post(
  "/import/:id/rollback",
  authenticate,
  authorize("super_admin", "admin"),
  rollbackCsvImport
);

export default router;
