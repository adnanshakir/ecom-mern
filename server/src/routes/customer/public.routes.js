import express from "express";
import {
  getPublicProducts,
  getPublicProductBySlug,
  getPublicCategories,
  getPublicSearchSuggestions,
  getPublicBanners,
} from "../../controllers/customer/public.controller.js";
import {
  getProductReviews,
  getReviewSummary,
} from "../../controllers/customer/review.controller.js";

const router = express.Router();

// No authenticate / authenticateCustomer middleware — fully public
router.get("/search/suggestions", getPublicSearchSuggestions);
router.get("/products", getPublicProducts);
router.get("/products/:slug", getPublicProductBySlug);
router.get("/categories", getPublicCategories);
router.get("/banners", getPublicBanners);

// Product reviews (public — no auth needed)
router.get("/products/:productId/reviews", getProductReviews);
router.get("/products/:productId/reviews/summary", getReviewSummary);

export default router;
