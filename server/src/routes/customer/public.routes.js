import express from "express";
import {
  getPublicProducts,
  getPublicProductBySlug,
  getPublicCategories,
} from "../../controllers/customer/public.controller.js";

const router = express.Router();

// No authenticate / authenticateCustomer middleware — fully public
router.get("/products", getPublicProducts);
router.get("/products/:slug", getPublicProductBySlug);
router.get("/categories", getPublicCategories);

export default router;
