import express from "express";
import {
  getMyReview,
  createReview,
  updateReview,
  deleteReview,
} from "../../controllers/customer/review.controller.js";
import { authenticateCustomer } from "../../middleware/authenticateCustomer.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import {
  createReviewSchema,
  updateReviewSchema,
} from "../../validations/customer/review.validation.js";

const router = express.Router();

/**
 * @route   GET /api/customers/reviews/mine/:productId
 * @desc    Get the authenticated customer's review for a product (or null)
 * @access  Private (authenticateCustomer)
 */
router.get("/mine/:productId", authenticateCustomer, getMyReview);

/**
 * @route   POST /api/customers/reviews/:productId
 * @desc    Create a review for a product (one per customer per product)
 * @access  Private (authenticateCustomer)
 */
router.post(
  "/:productId",
  authenticateCustomer,
  validate(createReviewSchema),
  createReview
);

/**
 * @route   PUT /api/customers/reviews/:reviewId
 * @desc    Update the authenticated customer's own review
 * @access  Private (authenticateCustomer)
 */
router.put(
  "/:reviewId",
  authenticateCustomer,
  validate(updateReviewSchema),
  updateReview
);

/**
 * @route   DELETE /api/customers/reviews/:reviewId
 * @desc    Delete the authenticated customer's own review
 * @access  Private (authenticateCustomer)
 */
router.delete("/:reviewId", authenticateCustomer, deleteReview);

export default router;
