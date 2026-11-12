import mongoose from "mongoose";
import Order from "../../models/customer/order.model.js";
import CustomerProfile from "../../models/customer/customer.model.js";
import ApiError from "../../utils/apiError.js";
import { adjustStock } from "../../utils/inventory.js";
import { createRazorpayRefund } from "../../utils/razorpay.js";

const STATUSES = ["placed", "packed", "shipped", "delivered", "cancelled"];

const findCustomerUsersByAuthIds = async (authIds) => {
  if (!authIds.length) return [];
  const objectIds = authIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  return mongoose.connection.db
    .collection("customerUser")
    .find({
      $or: [
        { id: { $in: authIds } },
        { _id: { $in: [...authIds, ...objectIds] } },
      ],
    })
    .project({ id: 1, name: 1, email: 1, phoneNumber: 1 })
    .toArray();
};

const customerDetails = async (orders) => {
  const profiles = orders.map((order) => order.customer).filter(Boolean);
  const authIds = profiles.map((profile) => profile.authUserId).filter(Boolean);
  const users = await findCustomerUsersByAuthIds(authIds);

  const byAuthId = new Map();
  for (const user of users) {
    if (user.id !== undefined && user.id !== null) {
      byAuthId.set(String(user.id), user);
    }
    if (user._id !== undefined && user._id !== null) {
      byAuthId.set(String(user._id), user);
    }
  }

  return orders.map((order) => {
    const profile = order.customer;
    const user = byAuthId.get(String(profile?.authUserId || ""));
    const value = order.toObject ? order.toObject() : order;
    return {
      ...value,
      customer: profile
        ? { ...profile.toObject(), name: user?.name || "", email: user?.email || "", phone: user?.phoneNumber || "" }
        : null,
    };
  });
};

const baseQuery = () => ({ "payment.status": "paid" });

export const getAdminOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, paymentStatus, search } = req.query;
    const filter = { ...baseQuery() };
    if (status) filter.orderStatus = status;
    if (paymentStatus) filter["payment.status"] = paymentStatus;
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    if (search) {
      const regex = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const matchedUsers = await mongoose.connection.db
        .collection("customerUser")
        .find({ $or: [{ name: regex }, { email: regex }, { phoneNumber: regex }] })
        .project({ id: 1, _id: 1 })
        .toArray();
      const matchingProfiles = await CustomerProfile.find({
        authUserId: { $in: matchedUsers.flatMap((user) => [user.id, String(user._id)].filter(Boolean)) },
      }).select("_id");
      filter.$or = [{ orderNumber: regex }, { customer: { $in: matchingProfiles.map((profile) => profile._id) } }];
    }
    const [orders, total] = await Promise.all([
      Order.find(filter).populate("customer").sort({ createdAt: -1 }).skip((Number(page) - 1) * safeLimit).limit(safeLimit),
      Order.countDocuments(filter),
    ]);
    res.json({ success: true, data: await customerDetails(orders), pagination: { total, page: Number(page), pages: Math.ceil(total / safeLimit) } });
  } catch (error) {
    next(error);
  }
};

export const getAdminOrderStats = async (req, res, next) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const [newCount, today] = await Promise.all([
      Order.countDocuments({ ...baseQuery(), orderStatus: "placed", adminSeen: false }),
      Order.find({
        ...baseQuery(),
        $or: [
          { "payment.paidAt": { $gte: start } },
          { "payment.paidAt": null, createdAt: { $gte: start } },
        ],
      }).select("total"),
    ]);
    const pendingCount = await Order.countDocuments({ ...baseQuery(), orderStatus: { $in: ["placed", "packed", "shipped"] } });
    res.json({ success: true, data: { newCount, todayCount: today.length, todayRevenue: today.reduce((sum, order) => sum + order.total, 0), pendingCount } });
  } catch (error) {
    next(error);
  }
};

export const getAdminOrder = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw new ApiError(400, "Invalid order id");
    const order = await Order.findOne({ _id: req.params.id }).populate("customer");
    if (!order) throw new ApiError(404, "Order not found");
    res.json({ success: true, data: (await customerDetails([order]))[0] });
  } catch (error) {
    next(error);
  }
};

const cancelPaidOrderWithRefundAndRestock = async (orderId, userId) => {
  // Atomically claim cancellation-refund ownership so concurrent cancel calls cannot double-refund
  let order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      ...baseQuery(),
      orderStatus: { $ne: "cancelled" },
      "payment.refundStatus": { $in: ["none", "failed", null] },
    },
    { $set: { "payment.refundStatus": "pending" } },
    { new: true }
  );

  // Also allow retrying stock restoration if a prior attempt already completed the refund
  if (!order) {
    order = await Order.findOne({
      _id: orderId,
      ...baseQuery(),
      orderStatus: { $ne: "cancelled" },
      "payment.refundStatus": "processed",
    });
  }

  if (!order) {
    const existing = await Order.findById(orderId);
    if (!existing || existing.payment?.status !== "paid") {
      throw new ApiError(404, "Order not found");
    }
    if (existing.orderStatus === "cancelled") {
      throw new ApiError(409, "Order is already cancelled");
    }
    throw new ApiError(409, "Order cancellation is already in progress");
  }

  let refundId = order.payment?.refundId;
  let refundedAt = order.payment?.refundedAt;

  // Step 1: Ensure payment refund completes before allowing cancellation
  if (!refundId) {
    if (!order.payment?.razorpayPaymentId) {
      await Order.updateOne(
        { _id: order._id },
        { $set: { "payment.refundStatus": "failed", "payment.refundError": "Missing payment reference for refund" } }
      );
      throw new ApiError(400, "Cannot cancel paid order without a payment reference for refund");
    }

    try {
      const refund = await createRazorpayRefund(
        order.payment.razorpayPaymentId,
        Math.round(order.total * 100),
        {
          orderId: String(order._id),
          orderNumber: order.orderNumber,
          reason: "admin_order_cancelled",
        }
      );
      refundId = refund.id;
      refundedAt = new Date();
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            "payment.refundId": refundId,
            "payment.refundStatus": "processed",
            "payment.refundedAt": refundedAt,
            "payment.refundError": "",
          },
        }
      );
    } catch (refundError) {
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            "payment.refundStatus": "failed",
            "payment.refundError": refundError.message || "Refund failed",
          },
        }
      );
      throw refundError;
    }
  }

  // Step 2: Restore deducted stock and mark order cancelled atomically in a transaction
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const locked = await Order.findOne({
      _id: order._id,
      orderStatus: { $ne: "cancelled" },
    }).session(session);
    if (!locked) {
      throw new ApiError(409, "Order is already cancelled");
    }

    if (locked.stockDeducted !== false && !locked.stockRestored) {
      for (const item of locked.items) {
        if (!item.variantId) {
          throw new ApiError(400, `Cannot restore stock for item ${item.name}: missing variant reference`);
        }
        await adjustStock({
          variantId: item.variantId,
          type: "return",
          quantity: item.quantity,
          reason: `Order cancelled: ${locked.orderNumber}`,
          userId,
          session,
        });
      }
    }

    locked.orderStatus = "cancelled";
    locked.stockRestored = true;
    locked.payment.status = "refunded";
    locked.payment.refundId = refundId;
    locked.payment.refundStatus = "processed";
    locked.payment.refundedAt = refundedAt || new Date();
    locked.payment.refundError = "";
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

export const updateAdminOrderStatus = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw new ApiError(400, "Invalid order id");
    if (!STATUSES.includes(req.body.orderStatus)) throw new ApiError(400, "Invalid order status");

    if (req.body.orderStatus === "cancelled") {
      const cancelledOrder = await cancelPaidOrderWithRefundAndRestock(req.params.id, req.user.id);
      return res.json({ success: true, data: cancelledOrder });
    }

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, ...baseQuery(), orderStatus: { $ne: "cancelled" } },
      { $set: { orderStatus: req.body.orderStatus } },
      { new: true, runValidators: true }
    );
    if (!order) {
      const existing = await Order.findById(req.params.id);
      if (existing?.orderStatus === "cancelled" && existing.payment?.status === "paid") {
        throw new ApiError(409, "Cancelled order status cannot be updated");
      }
      throw new ApiError(404, "Order not found");
    }
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const markAdminOrderSeen = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw new ApiError(400, "Invalid order id");
    const order = await Order.findOneAndUpdate({ _id: req.params.id }, { $set: { adminSeen: true } }, { new: true });
    if (!order) throw new ApiError(404, "Order not found");
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};
