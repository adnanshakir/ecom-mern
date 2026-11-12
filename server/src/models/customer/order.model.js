import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant" },
    name: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    variant: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, default: "" },
    phone: { type: String, default: "" },
    line1: { type: String, required: true },
    line2: { type: String, default: "" },
    city: { type: String, required: true },
    state: { type: String, default: "" },
    postalCode: { type: String, required: true },
    country: { type: String, default: "India" },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    idempotencyKey: { type: String, trim: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "CustomerProfile", required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    shippingAddress: { type: addressSchema, required: true },
    subtotal: { type: Number, required: true, min: 0 },
    shipping: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    payment: {
      method: { type: String, default: "razorpay" },
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refund_pending", "refunded"],
        default: "pending",
      },
      currency: { type: String, default: "INR" },
      razorpayOrderId: { type: String, index: true },
      razorpayPaymentId: { type: String },
      paidAt: { type: Date, index: true },
      refundId: { type: String },
      refundStatus: {
        type: String,
        enum: ["none", "pending", "processed", "failed"],
        default: "none",
      },
      refundedAt: { type: Date },
      refundError: { type: String, default: "" },
    },
    stockDeducted: { type: Boolean, default: false },
    stockRestored: { type: Boolean, default: false },
    fulfillmentRecoveryNeeded: { type: Boolean, default: false },
    fulfillmentFailureReason: { type: String, default: "" },
    orderStatus: {
      type: String,
      enum: ["placed", "packed", "shipped", "delivered", "cancelled"],
      default: "placed",
    },
    adminSeen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

orderSchema.index({ "payment.status": 1, createdAt: -1 });
orderSchema.index({ "payment.status": 1, "payment.paidAt": -1 });
orderSchema.index({ orderStatus: 1, adminSeen: 1 });
orderSchema.index(
  { customer: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
