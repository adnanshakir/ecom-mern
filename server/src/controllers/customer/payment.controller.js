import crypto from "crypto";
import Razorpay from "razorpay";
import mongoose from "mongoose";

import Cart from "../../models/customer/cart.model.js";
import Order from "../../models/customer/order.model.js";
import ProductVariant from "../../models/admin/productVariant.model.js";
import InventoryMovement from "../../models/admin/inventoryMovement.model.js";
import CustomerProfile from "../../models/customer/customer.model.js";
import ApiError from "../../utils/apiError.js";
import { config } from "../../config/config.js";

const DELIVERY_CHARGE = 100;

/**
 * Return the configured Razorpay client or reject unavailable checkout.
 */
const getRazorpay = () => {
  if (!config.razorpay.keyId || !config.razorpay.keySecret) {
    throw new ApiError(503, "Online payments are not configured");
  }

  return new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
  });
};

/**
 * Ensure the MongoDB deployment can provide the transaction guarantees checkout needs.
 */
const assertTransactionSupport = () => {
  const topologyType = mongoose.connection.getClient()?.topology?.description?.type;
  if (!["ReplicaSetWithPrimary", "Sharded", "LoadBalanced"].includes(topologyType)) {
    throw new ApiError(503, "Checkout requires a transaction-capable MongoDB deployment");
  }
};

/**
 * Create a bounded, unique Razorpay receipt while retaining customer and time identity.
 */
const createReceipt = (customerId) =>
  `fibio_${customerId.toString().slice(-12)}_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`.slice(
    0,
    40
  );

/**
 * Read the current cart and return the validated order snapshot.
 */
const getCartItems = async (customerId) => {
  const cart = await Cart.findOne({ customer: customerId }).populate({
    path: "items.variant",
    select: "sku price salePrice stock isActive product",
    populate: { path: "product", select: "name status" },
  });

  if (!cart?.items?.length) throw new ApiError(400, "Your cart is empty");

  const items = cart.items.map((item) => {
    const variant = item.variant;
    if (!variant || !variant.isActive || variant.product?.status !== "active") {
      throw new ApiError(400, "One or more items in your cart are no longer available");
    }
    if (variant.stock < item.quantity) {
      throw new ApiError(409, `Only ${variant.stock} of ${variant.sku} are available`);
    }

    const unitPrice = variant.salePrice ?? variant.price;
    return {
      variant: variant._id,
      product: variant.product._id,
      name: variant.product.name,
      sku: variant.sku,
      quantity: item.quantity,
      unitPrice,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  return { cart, items, subtotal };
};

const getDirectCheckoutItem = async (variantId, quantity) => {
  const variant = await ProductVariant.findById(variantId).populate({
    path: "product",
    select: "name status",
  });

  if (!variant || !variant.isActive || variant.product?.status !== "active") {
    throw new ApiError(400, "This product is no longer available");
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new ApiError(400, "Quantity must be a positive integer");
  }
  if (variant.stock < quantity) {
    throw new ApiError(409, `Only ${variant.stock} of ${variant.sku} are available`);
  }

  const unitPrice = variant.salePrice ?? variant.price;
  const items = [
    {
      variant: variant._id,
      product: variant.product._id,
      name: variant.product.name,
      sku: variant.sku,
      quantity,
      unitPrice,
    },
  ];

  return { items, subtotal: unitPrice * quantity };
};

/**
 * List the authenticated customer's orders from newest to oldest.
 */
export const getCustomerOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.customerProfile._id })
      .sort({ createdAt: -1 })
      .select(
        "items subtotal deliveryCharge total shippingAddress currency razorpayOrderId razorpayPaymentId status paidAt createdAt"
      );

    res.status(200).json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
};

/**
 * Validate the cart and address, then create the corresponding Razorpay order snapshot.
 */
export const createPaymentOrder = async (req, res, next) => {
  try {
    assertTransactionSupport();
    const isDirectCheckout = Boolean(req.body?.variantId);
    const checkout = isDirectCheckout
      ? await getDirectCheckoutItem(req.body.variantId, req.body.quantity)
      : await getCartItems(req.customerProfile._id);
    const { items, subtotal } = checkout;
    const profile = await CustomerProfile.findById(req.customerProfile._id);
    const addressId = req.body?.addressId;
    const shippingAddress = profile?.addresses?.find(
      (address) => address._id.toString() === addressId
    );
    if (!shippingAddress) throw new ApiError(400, "Select a delivery address before paying");

    const total = subtotal + DELIVERY_CHARGE;
    const razorpay = getRazorpay();
    const receipt = createReceipt(req.customerProfile._id);
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(total * 100),
      currency: "INR",
      receipt,
      notes: { customerId: req.customerProfile._id.toString() },
    });

    const order = await Order.create({
      customer: req.customerProfile._id,
      items,
      subtotal,
      deliveryCharge: DELIVERY_CHARGE,
      total,
      shippingAddress: shippingAddress.toObject(),
      currency: "INR",
      checkoutType: isDirectCheckout ? "direct" : "cart",
      razorpayOrderId: razorpayOrder.id,
    });

    res.status(201).json({
      success: true,
      data: {
        orderId: order._id,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        subtotal,
        deliveryCharge: DELIVERY_CHARGE,
        total,
        currency: razorpayOrder.currency,
        keyId: config.razorpay.keyId,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Verify a Razorpay signature and complete the order only after capture is confirmed.
 */
export const verifyPayment = async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  try {
    if (!config.razorpay.keySecret) {
      throw new ApiError(503, "Online payments are not configured");
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new ApiError(400, "Incomplete payment verification details");
    }

    const expectedSignature = crypto
      .createHmac("sha256", config.razorpay.keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (
      typeof razorpay_signature !== "string" ||
      !/^[a-f0-9]{64}$/i.test(razorpay_signature) ||
      expectedSignature.length !== razorpay_signature.length ||
      !crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpay_signature))
    ) {
      throw new ApiError(400, "Payment signature verification failed");
    }

    const razorpay = getRazorpay();
    const gatewayPayment = await razorpay.payments.fetch(razorpay_payment_id);
    if (gatewayPayment.order_id !== razorpay_order_id) {
      throw new ApiError(400, "Payment does not belong to this order");
    }
    if (gatewayPayment.status !== "captured") {
      throw new ApiError(409, "Payment has not been captured yet");
    }

    const completedOrder = await completeCapturedPayment({
      customerId: req.customerProfile._id,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpay,
    });

    res.status(200).json({
      success: true,
      data: { orderId: completedOrder._id, status: completedOrder.status },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Complete a captured payment exactly once and reconcile only its order snapshot.
 */
const completeCapturedPayment = async ({
  customerId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpay,
}) => {
  assertTransactionSupport();
  const session = await mongoose.startSession();
  let completedOrder;
  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne({
        customer: customerId,
        razorpayOrderId,
      }).session(session);

      if (!order) throw new ApiError(404, "Payment order not found");
      if (order.status === "paid") {
        if (order.razorpayPaymentId !== razorpayPaymentId) {
          throw new ApiError(409, "This payment order has already been completed");
        }
        completedOrder = order;
        return;
      }
      if (order.status === "failed")
        throw new ApiError(409, "This payment order cannot be completed");

      for (const item of order.items) {
        const updated = await ProductVariant.findOneAndUpdate(
          { _id: item.variant, isActive: true, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { returnDocument: "after", session }
        );
        if (!updated) throw new ApiError(409, `Insufficient stock for ${item.sku}`);

        await InventoryMovement.create(
          [
            {
              variant: updated._id,
              product: item.product,
              type: "sale",
              quantityChange: -item.quantity,
              previousStock: updated.stock + item.quantity,
              newStock: updated.stock,
              reason: `Razorpay payment ${razorpayPaymentId}`,
            },
          ],
          { session }
        );
      }

      order.status = "paid";
      order.razorpayPaymentId = razorpayPaymentId;
      order.paidAt = new Date();
      await order.save({ session });

      const cart =
        order.checkoutType === "cart"
          ? await Cart.findOne({ customer: customerId }).session(session)
          : null;
      if (cart) {
        const quantities = new Map(
          order.items.map((item) => [item.variant.toString(), item.quantity])
        );
        cart.items = cart.items
          .map((item) => {
            const remaining = item.quantity - (quantities.get(item.variant.toString()) || 0);
            quantities.delete(item.variant.toString());
            return remaining > 0 ? { ...item.toObject(), quantity: remaining } : null;
          })
          .filter(Boolean);
        await cart.save({ session });
      }
      completedOrder = order;
    });
  } catch (error) {
    if (error.statusCode === 409 && razorpay) {
      try {
        await razorpay.payments.refund(razorpayPaymentId, {});
      } catch {
        throw new ApiError(502, "Payment was captured but could not be reconciled or refunded");
      }
      await Order.updateOne(
        { customer: customerId, razorpayOrderId, status: "pending" },
        { $set: { status: "failed", razorpayPaymentId, failureReason: error.message } }
      );
    }
    throw error;
  } finally {
    await session.endSession();
  }
  return completedOrder;
};

/**
 * Reconcile a browser-interrupted payment using Razorpay's authoritative payment status.
 */
export const reconcilePayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId } = req.body || {};
    if (
      typeof razorpayOrderId !== "string" ||
      typeof razorpayPaymentId !== "string" ||
      !razorpayOrderId ||
      !razorpayPaymentId
    ) {
      throw new ApiError(400, "Payment reconciliation details are required");
    }

    const razorpay = getRazorpay();
    const payment = await razorpay.payments.fetch(razorpayPaymentId);
    if (payment.order_id !== razorpayOrderId)
      throw new ApiError(400, "Payment does not belong to this order");

    if (payment.status === "captured") {
      const existingOrder = await Order.findOne({
        customer: req.customerProfile._id,
        razorpayOrderId,
      }).select("status");
      if (existingOrder?.status === "failed") {
        try {
          await razorpay.payments.refund(razorpayPaymentId, {});
        } catch {
          throw new ApiError(502, "Payment was captured but could not be refunded");
        }
        return res.status(200).json({ success: true, data: { status: "failed" } });
      }
      const order = await completeCapturedPayment({
        customerId: req.customerProfile._id,
        razorpayOrderId,
        razorpayPaymentId,
        razorpay,
      });
      return res
        .status(200)
        .json({ success: true, data: { orderId: order._id, status: order.status } });
    }

    if (payment.status === "failed") {
      return res.status(200).json({ success: true, data: { status: "failed" } });
    }

    if (payment.status === "refunded") {
      await Order.updateOne(
        { customer: req.customerProfile._id, razorpayOrderId, status: "pending" },
        { $set: { status: "failed", failureReason: "Razorpay payment status: refunded" } }
      );
      return res.status(200).json({ success: true, data: { status: "failed" } });
    }

    return res.status(200).json({ success: true, data: { status: "pending" } });
  } catch (err) {
    next(err);
  }
};
