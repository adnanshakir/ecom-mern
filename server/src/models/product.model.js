import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: [true, "Brand is required"],
    },
    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "draft",
    },
    featured: {
      type: Boolean,
      default: false,
    },
    images: [
      {
        url: { type: String, required: true }, // ImageKit's URL of the uploaded image
        fileId: { type: String, required: true }, // ImageKit's internal reference, needed to delete the file later
        altText: { type: String, default: "" },
        position: { type: Number, default: 0 },
      },
    ],
    seoTitle: {
      type: String,
      trim: true,
    },
    seoDescription: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
export default Product;
