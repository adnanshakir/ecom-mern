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

const getRazorpay = () => {
  if (!config.razorpay.keyId || !config.razorpay.keySecret) {
    throw new ApiError(503, "Online payments are not configured");
  }

  return new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
  });
};

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

export const createPaymentOrder = async (req, res, next) => {
  try {
    const { items, subtotal } = await getCartItems(req.customerProfile._id);
    const profile = await CustomerProfile.findById(req.customerProfile._id);
    const addressId = req.body?.addressId;
    const shippingAddress = profile?.addresses?.find(
      (address) => address._id.toString() === addressId
    );
    if (!shippingAddress) throw new ApiError(400, "Select a delivery address before paying");

    const total = subtotal + DELIVERY_CHARGE;
    const razorpay = getRazorpay();
    const receipt = `fibio_${req.customerProfile._id}_${Date.now()}`;
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
      expectedSignature.length !== razorpay_signature.length ||
      !crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpay_signature))
    ) {
      throw new ApiError(400, "Payment signature verification failed");
    }

    const session = await mongoose.startSession();
    try {
      let completedOrder;
      await session.withTransaction(async () => {
        const order = await Order.findOne({
          customer: req.customerProfile._id,
          razorpayOrderId: razorpay_order_id,
        }).session(session);

        if (!order) throw new ApiError(404, "Payment order not found");
        if (order.status === "paid") {
          completedOrder = order;
          return;
        }

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
                reason: `Razorpay payment ${razorpay_payment_id}`,
              },
            ],
            { session }
          );
        }

        order.status = "paid";
        order.razorpayPaymentId = razorpay_payment_id;
        order.paidAt = new Date();
        await order.save({ session });
        await Cart.updateOne(
          { customer: req.customerProfile._id },
          { $set: { items: [] } },
          { session }
        );
        completedOrder = order;
      });

      res.status(200).json({
        success: true,
        data: { orderId: completedOrder._id, status: completedOrder.status },
      });
    } finally {
      await session.endSession();
    }
  } catch (err) {
    next(err);
  }
};
