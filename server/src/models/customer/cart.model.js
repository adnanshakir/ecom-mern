import mongoose from "mongoose";

const processedMergeBatchSchema = new mongoose.Schema(
  {
    batchId: { type: String, required: true },
    skippedItems: [
      {
        _id: false,
        variantId: { type: String, required: true },
        sku: { type: String, default: "" },
        productName: { type: String, default: "" },
        requestedQuantity: { type: Number, required: true },
        reason: {
          type: String,
          enum: ["not_found", "inactive", "out_of_stock"],
          required: true,
        },
      },
    ],
    processedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerProfile",
      required: true,
      unique: true, // one cart per customer
    },
    items: [
      {
        variant: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ProductVariant",
          required: true,
        },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    processedMergeBatches: {
      type: [processedMergeBatchSchema],
      default: [],
      select: false,
    },
  },
  { timestamps: true }
);

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;
