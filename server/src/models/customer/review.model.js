import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product reference is required"],
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerProfile",
      required: [true, "Customer profile reference is required"],
    },
    customerAuthUserId: {
      type: String,
      required: [true, "Customer auth user ID is required"],
    },
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    title: {
      type: String,
      trim: true,
      maxlength: [100, "Review title cannot exceed 100 characters"],
      default: "",
    },
    body: {
      type: String,
      trim: true,
      maxlength: [2000, "Review body cannot exceed 2000 characters"],
      default: "",
    },
    images: {
      type: [
        {
          url: { type: String, required: true },
          fileId: { type: String, default: null },
        },
      ],
      validate: {
        validator: (arr) => arr.length <= 4,
        message: "A review can have at most 4 images",
      },
      default: [],
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Paginated listing: latest reviews first per product
reviewSchema.index({ product: 1, createdAt: -1 });

// One review per customer per product (unique compound index)
reviewSchema.index({ product: 1, customerAuthUserId: 1 }, { unique: true });

const Review = mongoose.model("Review", reviewSchema);
export default Review;
