import crypto from "crypto";
import mongoose from "mongoose";
import Cart from "../../models/customer/cart.model.js";
import Order from "../../models/customer/order.model.js";
import ProductVariant from "../../models/admin/productVariant.model.js";
import ApiError from "../../utils/apiError.js";
import { cleanupLegacyOrderIndexes } from "../../config/db.js";
import {
  createRazorpayOrder,
  createRazorpayRefund,
  fetchRazorpayPayment,
} from "../../utils/razorpay.js";

const SHIPPING = 100;
const MAX_RECEIPT_ATTEMPTS = 5;
const FINALIZED_PAYMENT_STATUSES = ["paid", "refund_pending", "refunded"];

class InsufficientStockAtCaptureError extends Error {
  constructor(message = "Insufficient stock to fulfill captured order") {
    super(message);
    this.name = "InsufficientStockAtCaptureError";
  }
}

const getOrderNumber = () =>
  `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

const getCustomerName = (customer) => customer?.name || customer?.fullName || "";

const buildGatewayResponse = (order, razorpayOrder = null) => ({
  orderId: order._id,
  keyId: process.env.RAZORPAY_KEY_ID,
  amount: razorpayOrder?.amount ?? Math.round(order.total * 100),
  currency: razorpayOrder?.currency || order.payment?.currency || "INR",
  razorpayOrderId: razorpayOrder?.id || order.payment?.razorpayOrderId,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForIdempotentOrder = async (customerId, idempotencyKey) => {
  for (let attempt = 0; attempt < 15; attempt++) {
    const existing = await Order.findOne({ customer: customerId, idempotencyKey });
    if (!existing) return null;
    if (
      existing.payment?.razorpayOrderId ||
      FINALIZED_PAYMENT_STATUSES.includes(existing.payment?.status)
    ) {
      return existing;
    }
    await sleep(100);
  }
  const latest = await Order.findOne({ customer: customerId, idempotencyKey });
  if (latest && !latest.payment?.razorpayOrderId) {
    throw new ApiError(409, "Checkout is already in progress. Please retry in a moment.");
  }
  return latest;
};

const getCheckoutItems = async (customerId, checkoutItem) => {
  const ids = checkoutItem?.variantId
    ? [{ variant: checkoutItem.variantId, quantity: checkoutItem.quantity }]
    : (await Cart.findOne({ customer: customerId }))?.items || [];
  if (!ids.length) throw new ApiError(400, "Your cart is empty");

  const items = [];
  for (const requested of ids) {
    if (!mongoose.Types.ObjectId.isValid(requested.variant))
      throw new ApiError(400, "Invalid product variant");
    const variant = await ProductVariant.findById(requested.variant).populate(
      "product",
      "name images"
    );
    if (!variant || !variant.isActive)
      throw new ApiError(400, "A product in your cart is no longer available");
    if (
      !Number.isInteger(requested.quantity) ||
      requested.quantity < 1 ||
      requested.quantity > variant.stock
    ) {
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

/**
 * Attempt automatic Razorpay refund for a captured payment that could not be fulfilled
 * due to post-checkout stock changes. Persists outcome durably so failed refund calls
 * remain in `refund_pending` and can be retried via reconciliation.
 */
const recoverRefundForOrder = async (order, reason = "insufficient_stock_after_payment") => {
  if (!order?.payment?.razorpayPaymentId) return order;
  if (order.payment?.status === "refunded" && order.payment?.refundStatus === "processed") {
    return order;
  }

  // Atomically claim eligible refund_pending order before calling Razorpay
  const claimed = await Order.findOneAndUpdate(
    {
      _id: order._id,
      "payment.status": "refund_pending",
      "payment.refundStatus": { $in: ["none", "pending", "failed", null] },
    },
    {
      $set: {
        "payment.refundStatus": "processing",
        "payment.refundClaimedAt": new Date(),
      },
    },
    { returnDocument: "after" }
  );
  if (!claimed) {
    return (await Order.findById(order._id)) || order;
  }

  try {
    const refund = await createRazorpayRefund(
      claimed.payment.razorpayPaymentId,
      Math.round(claimed.total * 100),
      {
        orderId: String(claimed._id),
        orderNumber: claimed.orderNumber,
        reason,
      }
    );
    const updated = await Order.findOneAndUpdate(
      {
        _id: claimed._id,
        "payment.status": "refund_pending",
        "payment.refundStatus": "processing",
      },
      {
        $set: {
          "payment.status": "refunded",
          "payment.refundId": refund.id,
          "payment.refundStatus": "processed",
          "payment.refundedAt": new Date(),
          "payment.refundError": "",
          "payment.refundClaimedAt": null,
          orderStatus: "cancelled",
          fulfillmentRecoveryNeeded: false,
        },
      },
      { returnDocument: "after" }
    );
    return updated || (await Order.findById(claimed._id)) || claimed;
  } catch (refundError) {
    const updated = await Order.findOneAndUpdate(
      {
        _id: claimed._id,
        "payment.status": "refund_pending",
        "payment.refundStatus": "processing",
      },
      {
        $set: {
          "payment.refundStatus": "failed",
          "payment.refundError": refundError.message || "Refund initiation failed",
          "payment.refundClaimedAt": null,
          fulfillmentRecoveryNeeded: true,
        },
      },
      { returnDocument: "after" }
    );
    return updated || (await Order.findById(claimed._id)) || claimed;
  }
};

/**
 * Mark an order as paid after capture confirmation and deduct variant stock atomically.
 * Note: Stock is NOT reserved when creating the checkout order, so if stock drops before
 * payment capture completes, the stock transaction aborts cleanly without partial deductions,
 * the captured payment is durably recorded (never left `pending`), and automatic refund/recovery runs.
 */
const markOrderPaid = async (order, paymentId, paidAt = new Date()) => {
  if (order.payment?.status === "paid") return order;
  if (order.payment?.status === "refund_pending") {
    return recoverRefundForOrder(order);
  }
  if (order.payment?.status === "refunded") return order;

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const locked = await Order.findOne({
      _id: order._id,
      "payment.status": { $nin: FINALIZED_PAYMENT_STATUSES },
    }).session(session);
    if (!locked) {
      await session.abortTransaction();
      const latest = await Order.findById(order._id);
      if (latest?.payment?.status === "refund_pending") {
        return recoverRefundForOrder(latest);
      }
      return latest;
    }

    for (const item of locked.items) {
      const result = await ProductVariant.updateOne(
        { _id: item.variantId, isActive: true, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { session }
      );
      if (result.modifiedCount !== 1) {
        throw new InsufficientStockAtCaptureError(
          `Insufficient stock for ${item.name || "item"} when completing captured payment`
        );
      }
    }

    locked.payment.status = "paid";
    locked.payment.razorpayPaymentId = paymentId;
    locked.payment.paidAt = paidAt;
    locked.stockDeducted = true;
    locked.fulfillmentRecoveryNeeded = false;
    await locked.save({ session });
    await session.commitTransaction();
    return locked;
  } catch (error) {
    await session.abortTransaction();
    if (error instanceof InsufficientStockAtCaptureError) {
      const recorded = await Order.findOneAndUpdate(
        { _id: order._id, "payment.status": { $nin: FINALIZED_PAYMENT_STATUSES } },
        {
          $set: {
            "payment.status": "refund_pending",
            "payment.razorpayPaymentId": paymentId,
            "payment.paidAt": paidAt,
            "payment.refundStatus": "pending",
            orderStatus: "cancelled",
            stockDeducted: false,
            fulfillmentRecoveryNeeded: true,
            fulfillmentFailureReason: error.message,
          },
        },
        { returnDocument: "after" }
      );
      const target = recorded || (await Order.findById(order._id));
      if (target?.payment?.status === "refund_pending") {
        return recoverRefundForOrder(target);
      }
      return target;
    }
    throw error;
  } finally {
    session.endSession();
  }
};

export const createPaymentOrder = async (req, res, next) => {
  try {
    const rawKey = req.get("Idempotency-Key") ?? req.body?.idempotencyKey;
    let idempotencyKey;
    if (rawKey !== undefined && rawKey !== null) {
      if (typeof rawKey !== "string" || !rawKey.trim() || rawKey.trim().length > 128) {
        throw new ApiError(400, "Invalid idempotency key");
      }
      idempotencyKey = rawKey.trim();
    }

    if (idempotencyKey) {
      const existing = await waitForIdempotentOrder(req.customerProfile._id, idempotencyKey);
      if (existing) {
        if (FINALIZED_PAYMENT_STATUSES.includes(existing.payment?.status)) {
          throw new ApiError(409, "Payment has already been completed for this checkout");
        }
        return res.status(200).json({
          success: true,
          data: buildGatewayResponse(existing),
        });
      }
    }

    const address = req.customerProfile.addresses.id(req.body.addressId);
    if (!address) throw new ApiError(400, "Delivery address not found");
    const items = await getCheckoutItems(
      req.customerProfile._id,
      req.body.variantId ? req.body : null
    );
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    let order = null;
    for (let attempt = 0; attempt < MAX_RECEIPT_ATTEMPTS; attempt++) {
      try {
        order = await Order.create({
          orderNumber: getOrderNumber(),
          ...(idempotencyKey ? { idempotencyKey } : {}),
          customer: req.customerProfile._id,
          items,
          shippingAddress: {
            ...address.toObject(),
            fullName: address.fullName?.trim() || getCustomerName(req.customer),
          },
          subtotal,
          shipping: SHIPPING,
          total: subtotal + SHIPPING,
          payment: { method: "razorpay", status: "pending", currency: "INR" },
          stockDeducted: false,
        });
        break;
      } catch (err) {
        if (err?.code === 11000) {
          const dupKeys = Object.keys(err?.keyPattern || {});
          const isLegacyRazorpayIndexConflict =
            dupKeys.includes("razorpayOrderId") ||
            String(err?.message).includes("index: razorpayOrderId_1");
          if (isLegacyRazorpayIndexConflict) {
            await cleanupLegacyOrderIndexes();
            continue;
          }

          const isIdempotencyConflict =
            Boolean(idempotencyKey) &&
            (dupKeys.includes("idempotencyKey") || String(err?.message).includes("idempotencyKey"));
          if (isIdempotencyConflict) {
            const existing = await waitForIdempotentOrder(req.customerProfile._id, idempotencyKey);
            if (existing) {
              if (FINALIZED_PAYMENT_STATUSES.includes(existing.payment?.status)) {
                throw new ApiError(409, "Payment has already been completed for this checkout");
              }
              return res.status(200).json({
                success: true,
                data: buildGatewayResponse(existing),
              });
            }
            continue;
          }

          const isReceiptConflict =
            dupKeys.includes("orderNumber") || String(err?.message).includes("orderNumber");
          if (isReceiptConflict) {
            continue;
          }
        }
        throw err;
      }
    }

    if (!order) {
      throw new ApiError(500, "Unable to generate a unique order number. Please try again.");
    }

    try {
      const razorpayOrder = await createRazorpayOrder(
        Math.round(order.total * 100),
        order.orderNumber
      );
      order.payment.razorpayOrderId = razorpayOrder.id;
      if (razorpayOrder.currency) order.payment.currency = razorpayOrder.currency;
      await order.save();
      res.status(201).json({
        success: true,
        data: buildGatewayResponse(order, razorpayOrder),
      });
    } catch (error) {
      await Order.deleteOne({ _id: order._id, "payment.razorpayOrderId": { $exists: false } });
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

const evaluateCapturedPayment = async (order, razorpayOrderId, paymentId) => {
  const payment = await fetchRazorpayPayment(paymentId);
  const expectedAmount = Math.round(order.total * 100);

  if (
    payment.order_id !== razorpayOrderId ||
    (typeof payment.amount === "number" && payment.amount !== expectedAmount)
  ) {
    return { gatewayState: "mismatch", payment };
  }

  if (payment.status === "failed") {
    return { gatewayState: "failed", payment };
  }

  if (payment.status !== "captured") {
    return { gatewayState: "pending", payment };
  }

  const paidAt = payment.captured_at ? new Date(payment.captured_at * 1000) : new Date();
  return { gatewayState: "captured", payment, paidAt };
};

export const verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = req.body;
    if (!razorpayOrderId || !paymentId) {
      throw new ApiError(400, "Payment verification details are required");
    }

    const order = await Order.findOne({
      customer: req.customerProfile._id,
      "payment.razorpayOrderId": razorpayOrderId,
    });
    if (!order) throw new ApiError(404, "Payment order not found");

    if (order.payment.status === "paid" || order.payment.status === "refunded") {
      return res.json({
        success: true,
        data: { status: order.payment.status, orderId: order._id },
      });
    }
    if (order.payment.status === "refund_pending") {
      const recovered = await recoverRefundForOrder(order);
      return res.json({
        success: true,
        data: { status: recovered.payment.status, orderId: recovered._id },
      });
    }

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(`${razorpayOrderId}|${paymentId}`)
      .digest("hex");
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(String(signature || ""));
    if (
      expectedBuffer.length !== actualBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
    ) {
      throw new ApiError(400, "Invalid payment signature");
    }

    const { gatewayState, paidAt } = await evaluateCapturedPayment(
      order,
      razorpayOrderId,
      paymentId
    );
    if (gatewayState === "mismatch") {
      throw new ApiError(400, "Payment details do not match order");
    }
    if (gatewayState === "failed") {
      await Order.updateOne(
        { _id: order._id, "payment.status": { $nin: FINALIZED_PAYMENT_STATUSES } },
        { $set: { "payment.status": "failed", "payment.razorpayPaymentId": paymentId } }
      );
      return res.json({ success: true, data: { status: "failed", orderId: order._id } });
    }
    if (gatewayState !== "captured") {
      await Order.updateOne(
        { _id: order._id, "payment.status": { $nin: FINALIZED_PAYMENT_STATUSES } },
        { $set: { "payment.status": "pending", "payment.razorpayPaymentId": paymentId } }
      );
      return res.json({ success: true, data: { status: "pending", orderId: order._id } });
    }

    const completed = await markOrderPaid(order, paymentId, paidAt);
    return res.json({
      success: true,
      data: {
        status: completed.payment.status,
        orderId: completed._id,
        ...(completed.payment.refundId ? { refundId: completed.payment.refundId } : {}),
      },
      ...(completed.payment.status === "refunded"
        ? { message: "Item went out of stock after checkout; your payment has been refunded." }
        : completed.payment.status === "refund_pending"
          ? { message: "Item went out of stock after checkout; refund initiation is in progress." }
          : {}),
    });
  } catch (error) {
    next(error);
  }
};

export const reconcilePayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId } = req.body;
    if (!razorpayOrderId || !razorpayPaymentId) {
      throw new ApiError(400, "Payment reconciliation details are required");
    }

    const order = await Order.findOne({
      customer: req.customerProfile._id,
      "payment.razorpayOrderId": razorpayOrderId,
    });
    if (!order) throw new ApiError(404, "Payment order not found");

    if (order.payment.status === "paid" || order.payment.status === "refunded") {
      return res.json({
        success: true,
        data: { status: order.payment.status, orderId: order._id },
      });
    }
    if (order.payment.status === "refund_pending") {
      const recovered = await recoverRefundForOrder(order);
      return res.json({
        success: true,
        data: { status: recovered.payment.status, orderId: recovered._id },
      });
    }

    const { gatewayState, paidAt } = await evaluateCapturedPayment(
      order,
      razorpayOrderId,
      razorpayPaymentId
    );
    if (gatewayState === "mismatch" || gatewayState === "failed") {
      if (gatewayState === "failed") {
        await Order.updateOne(
          { _id: order._id, "payment.status": { $nin: FINALIZED_PAYMENT_STATUSES } },
          { $set: { "payment.status": "failed", "payment.razorpayPaymentId": razorpayPaymentId } }
        );
      }
      return res.json({ success: true, data: { status: "failed", orderId: order._id } });
    }
    if (gatewayState !== "captured") {
      await Order.updateOne(
        { _id: order._id, "payment.status": { $nin: FINALIZED_PAYMENT_STATUSES } },
        { $set: { "payment.status": "pending", "payment.razorpayPaymentId": razorpayPaymentId } }
      );
      return res.json({ success: true, data: { status: "pending", orderId: order._id } });
    }

    const completed = await markOrderPaid(order, razorpayPaymentId, paidAt);
    return res.json({
      success: true,
      data: {
        status: completed.payment.status,
        orderId: completed._id,
        ...(completed.payment.refundId ? { refundId: completed.payment.refundId } : {}),
      },
      ...(completed.payment.status === "refunded"
        ? { message: "Item went out of stock after checkout; your payment has been refunded." }
        : completed.payment.status === "refund_pending"
          ? { message: "Item went out of stock after checkout; refund initiation is in progress." }
          : {}),
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({
      customer: req.customerProfile._id,
      "payment.status": { $in: FINALIZED_PAYMENT_STATUSES },
    }).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};
