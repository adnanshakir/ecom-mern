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
      status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
      razorpayOrderId: { type: String, index: true },
      razorpayPaymentId: { type: String },
    },
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
orderSchema.index({ orderStatus: 1, adminSeen: 1 });

const Order = mongoose.model("Order", orderSchema);
export default Order;
