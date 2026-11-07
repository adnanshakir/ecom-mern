import crypto from "crypto";
import mongoose from "mongoose";
import Cart from "../../models/customer/cart.model.js";
import Order from "../../models/customer/order.model.js";
import ProductVariant from "../../models/admin/productVariant.model.js";
import ApiError from "../../utils/apiError.js";

const SHIPPING = 100;

const getOrderNumber = () =>
  `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(1000 + Math.random() * 9000))}`;

const getCustomerName = (customer) => customer?.name || customer?.fullName || "";

const getCheckoutItems = async (customerId, checkoutItem) => {
  const ids = checkoutItem?.variantId
    ? [{ variant: checkoutItem.variantId, quantity: checkoutItem.quantity }]
    : (await Cart.findOne({ customer: customerId }))?.items || [];
  if (!ids.length) throw new ApiError(400, "Your cart is empty");

  const items = [];
  for (const requested of ids) {
    if (!mongoose.Types.ObjectId.isValid(requested.variant)) throw new ApiError(400, "Invalid product variant");
    const variant = await ProductVariant.findById(requested.variant).populate("product", "name images");
    if (!variant || !variant.isActive) throw new ApiError(400, "A product in your cart is no longer available");
    if (!Number.isInteger(requested.quantity) || requested.quantity < 1 || requested.quantity > variant.stock) {
      throw new ApiError(400, `${variant.product?.name || "Product"} has insufficient stock`);
    }
    const unitPrice = variant.salePrice ?? variant.price;
    items.push({
      product: variant.product?._id,
      variantId: variant._id,
      name: variant.product?.name || "Item",
      image: variant.images?.[0]?.url || variant.product?.images?.[0]?.url || "",
      variant: variant.options?.map((option) => `${option.name}: ${option.value}`).join(", ") || "",
      quantity: requested.quantity,
      unitPrice,
    });
  }
  return items;
};

const createRazorpayOrder = async (amount, receipt) => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret) throw new ApiError(503, "Payment gateway is not configured");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount, currency: "INR", receipt }),
  });
  if (!response.ok) throw new ApiError(502, "Unable to create payment order");
  return response.json();
};

const markOrderPaid = async (order, paymentId) => {
  if (order.payment.status === "paid") return order;
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const locked = await Order.findOne({ _id: order._id, "payment.status": { $ne: "paid" } }).session(session);
    if (!locked) return Order.findById(order._id);
    for (const item of locked.items) {
      const result = await ProductVariant.updateOne(
        { _id: item.variantId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { session }
      );
      if (result.modifiedCount !== 1) throw new ApiError(409, "Insufficient stock to complete this order");
    }
    locked.payment.status = "paid";
    locked.payment.razorpayPaymentId = paymentId;
    await locked.save({ session });
    await session.commitTransaction();
    return locked;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const createPaymentOrder = async (req, res, next) => {
  try {
    const address = req.customerProfile.addresses.id(req.body.addressId);
    if (!address) throw new ApiError(400, "Delivery address not found");
    const items = await getCheckoutItems(req.customerProfile._id, req.body.variantId ? req.body : null);
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const order = await Order.create({
      orderNumber: getOrderNumber(),
      customer: req.customerProfile._id,
      items,
      shippingAddress: { ...address.toObject(), fullName: getCustomerName(req.customer) },
      subtotal,
      shipping: SHIPPING,
      total: subtotal + SHIPPING,
      payment: { method: "razorpay", status: "pending" },
    });
    try {
      const razorpayOrder = await createRazorpayOrder(Math.round(order.total * 100), order.orderNumber);
      order.payment.razorpayOrderId = razorpayOrder.id;
      await order.save();
      res.status(201).json({
        success: true,
        data: {
          orderId: order._id,
          keyId: process.env.RAZORPAY_KEY_ID,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          razorpayOrderId: razorpayOrder.id,
        },
      });
    } catch (error) {
      await Order.deleteOne({ _id: order._id });
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id: razorpayOrderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
    const order = await Order.findOne({ customer: req.customerProfile._id, "payment.razorpayOrderId": razorpayOrderId });
    if (!order) throw new ApiError(404, "Payment order not found");
    if (order.payment.status === "paid") return res.json({ success: true, data: { status: "paid", orderId: order._id } });
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(`${razorpayOrderId}|${paymentId}`).digest("hex");
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(String(signature || ""));
    if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
      throw new ApiError(400, "Invalid payment signature");
    }
    const paid = await markOrderPaid(order, paymentId);
    res.json({ success: true, data: { status: "paid", orderId: paid._id } });
  } catch (error) {
    next(error);
  }
};

export const reconcilePayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId } = req.body;
    const order = await Order.findOne({ customer: req.customerProfile._id, "payment.razorpayOrderId": razorpayOrderId });
    if (!order) throw new ApiError(404, "Payment order not found");
    if (order.payment.status === "paid") return res.json({ success: true, data: { status: "paid", orderId: order._id } });
    const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpayPaymentId)}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}` },
    });
    if (!response.ok) throw new ApiError(502, "Unable to verify payment status");
    const payment = await response.json();
    if (payment.order_id !== razorpayOrderId || !["captured", "authorized"].includes(payment.status)) {
      return res.json({ success: true, data: { status: "failed" } });
    }
    const paid = await markOrderPaid(order, razorpayPaymentId);
    res.json({ success: true, data: { status: "paid", orderId: paid._id } });
  } catch (error) {
    next(error);
  }
};

export const getCustomerOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.customerProfile._id, "payment.status": "paid" }).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};
