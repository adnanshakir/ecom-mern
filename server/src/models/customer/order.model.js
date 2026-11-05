import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    variant: { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant", required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderAddressSchema = new mongoose.Schema(
  {
    label: String,
    line1: { type: String, required: true },
    line2: String,
    city: { type: String, required: true },
    state: String,
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    phone: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerProfile",
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [(items) => items.length > 0, "Order must contain items"],
    },
    subtotal: { type: Number, required: true, min: 0 },
    deliveryCharge: { type: Number, required: true, min: 0, default: 100 },
    total: { type: Number, required: true, min: 0 },
    shippingAddress: { type: orderAddressSchema, required: true },
    currency: { type: String, required: true, enum: ["INR"], default: "INR" },
    razorpayOrderId: { type: String, required: true, unique: true, index: true },
    razorpayPaymentId: { type: String, unique: true, sparse: true, index: true },
    status: { type: String, enum: ["pending", "paid", "failed"], default: "pending", index: true },
    paidAt: Date,
    failureReason: String,
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
