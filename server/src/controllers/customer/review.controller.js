import mongoose from "mongoose";
import Review from "../../models/customer/review.model.js";
import Product from "../../models/admin/product.model.js";
import ApiError from "../../utils/apiError.js";

// ─────────────────────── PUBLIC ───────────────────────

/**
 * GET /api/public/products/:productId/reviews
 * Paginated review list for a product (public, no auth needed).
 * Query params: page (default 1), limit (default 10), sort (most_recent | highest_rated | lowest_rated)
 */
export const getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new ApiError(400, "Invalid product ID");
    }

    const { page = 1, limit = 10, sort = "most_recent" } = req.query;

    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const safePage = Math.max(Number(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    // Sort mapping
    let sortOption = { createdAt: -1 }; // most_recent
    if (sort === "highest_rated") sortOption = { rating: -1, createdAt: -1 };
    else if (sort === "lowest_rated") sortOption = { rating: 1, createdAt: -1 };

    const filter = { product: productId };

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(safeLimit)
        .select("customerName rating title body images isVerifiedPurchase isEdited createdAt")
        .lean(),
      Review.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: reviews,
      pagination: {
        total,
        page: safePage,
        pages: Math.ceil(total / safeLimit),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/public/products/:productId/reviews/summary
 * Aggregated review summary: average rating, total count, distribution by star.
 */
export const getReviewSummary = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new ApiError(400, "Invalid product ID");
    }

    const objectProductId = new mongoose.Types.ObjectId(productId);

    const [aggResult] = await Review.aggregate([
      { $match: { product: objectProductId } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          star5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
          star4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          star3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          star2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          star1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
        },
      },
    ]);

    const summary = aggResult
      ? {
          averageRating: Math.round(aggResult.averageRating * 100) / 100,
          totalReviews: aggResult.totalReviews,
          distribution: {
            5: aggResult.star5,
            4: aggResult.star4,
            3: aggResult.star3,
            2: aggResult.star2,
            1: aggResult.star1,
          },
        }
      : {
          averageRating: 0,
          totalReviews: 0,
          distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        };

    res.status(200).json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────── AUTHENTICATED (CUSTOMER) ───────────────────────

/**
 * GET /api/customers/reviews/mine/:productId
 * Check if the authenticated customer already has a review for this product.
 * Returns the review if found, or null.
 */
export const getMyReview = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new ApiError(400, "Invalid product ID");
    }

    const review = await Review.findOne({
      product: productId,
      customerAuthUserId: req.customer.id,
    })
      .select("rating title body images isEdited createdAt")
      .lean();

    res.status(200).json({ success: true, data: review });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/customers/reviews/:productId
 * Create a new review for a product.
 * Body is pre-validated by the validate middleware (createReviewSchema).
 */
export const createReview = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new ApiError(400, "Invalid product ID");
    }

    // Verify the product exists and is active
    const product = await Product.findById(productId).select("status").lean();
    if (!product || product.status !== "active") {
      throw new ApiError(404, "Product not found");
    }

    // Check for existing review (unique index will also catch this, but a friendly message is better)
    const existing = await Review.findOne({
      product: productId,
      customerAuthUserId: req.customer.id,
    }).lean();

    if (existing) {
      throw new ApiError(
        409,
        "You have already reviewed this product. You can edit your existing review instead."
      );
    }

    const { rating, title, body, images } = req.body;

    const review = await Review.create({
      product: productId,
      customer: req.customerProfile._id,
      customerAuthUserId: req.customer.id,
      customerName: req.customer.name || "Customer",
      rating,
      title,
      body,
      images,
    });

    res.status(201).json({
      success: true,
      data: {
        _id: review._id,
        rating: review.rating,
        title: review.title,
        body: review.body,
        images: review.images,
        customerName: review.customerName,
        isEdited: review.isEdited,
        createdAt: review.createdAt,
      },
    });
  } catch (err) {
    // Handle duplicate key error from the unique compound index
    if (err.code === 11000) {
      return next(
        new ApiError(
          409,
          "You have already reviewed this product. You can edit your existing review instead."
        )
      );
    }
    next(err);
  }
};

/**
 * PUT /api/customers/reviews/:reviewId
 * Update the authenticated customer's own review.
 * Body is pre-validated by the validate middleware (updateReviewSchema).
 */
export const updateReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      throw new ApiError(400, "Invalid review ID");
    }

    const review = await Review.findById(reviewId);

    if (!review) {
      throw new ApiError(404, "Review not found");
    }

    // Ownership check
    if (review.customerAuthUserId !== req.customer.id) {
      throw new ApiError(403, "You can only edit your own reviews");
    }

    const { rating, title, body, images } = req.body;

    if (rating !== undefined) review.rating = rating;
    if (title !== undefined) review.title = title;
    if (body !== undefined) review.body = body;
    if (images !== undefined) review.images = images;
    review.isEdited = true;

    await review.save();

    res.status(200).json({
      success: true,
      data: {
        _id: review._id,
        rating: review.rating,
        title: review.title,
        body: review.body,
        images: review.images,
        customerName: review.customerName,
        isEdited: review.isEdited,
        createdAt: review.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/customers/reviews/:reviewId
 * Delete the authenticated customer's own review.
 */
export const deleteReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      throw new ApiError(400, "Invalid review ID");
    }

    const review = await Review.findById(reviewId);

    if (!review) {
      throw new ApiError(404, "Review not found");
    }

    // Ownership check
    if (review.customerAuthUserId !== req.customer.id) {
      throw new ApiError(403, "You can only delete your own reviews");
    }

    await review.deleteOne();

    res.status(200).json({ success: true, message: "Review deleted successfully" });
  } catch (err) {
    next(err);
  }
};
