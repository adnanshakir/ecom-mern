import mongoose from "mongoose";
import Order from "../../models/customer/order.model.js";
import CustomerProfile from "../../models/customer/customer.model.js";
import ApiError from "../../utils/apiError.js";
import { adjustStock } from "../../utils/inventory.js";
import { createRazorpayRefund, fetchRazorpayRefunds } from "../../utils/razorpay.js";

const STATUSES = ["placed", "packed", "shipped", "delivered", "cancelled"];
const REFUND_CLAIM_LEASE_MS = Number(process.env.REFUND_CLAIM_LEASE_MS) || 2 * 60 * 1000;

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

const recordRefundSuccess = async (orderId, refundId, refundedAt) => {
  await Order.updateOne(
    { _id: orderId },
    {
      $set: {
        "payment.status": "refunded",
        "payment.refundId": refundId,
        "payment.refundStatus": "processed",
        "payment.refundedAt": refundedAt,
        "payment.refundError": "",
        "payment.refundClaimedAt": null,
        fulfillmentRecoveryNeeded: true,
      },
    }
  );
};

const reconcileExistingRefundsBeforeRetry = async (order, claimTimestamp) => {
  if (order.payment?.refundId || !order.payment?.razorpayPaymentId) {
    return { refundId: order.payment?.refundId, refundedAt: order.payment?.refundedAt };
  }

  const refundsCollection = await fetchRazorpayRefunds(order.payment.razorpayPaymentId);
  const items = Array.isArray(refundsCollection?.items) ? refundsCollection.items : [];
  const activeRefund = items.find((item) => item?.status && item.status !== "failed");
  if (!activeRefund) {
    return { refundId: null, refundedAt: null };
  }

  const refundedAt = activeRefund.created_at ? new Date(activeRefund.created_at * 1000) : new Date();
  if (activeRefund.status === "processed") {
    await recordRefundSuccess(order._id, activeRefund.id, refundedAt);
    return { refundId: activeRefund.id, refundedAt };
  }

  await Order.updateOne(
    { _id: order._id },
    {
      $set: {
        "payment.refundId": activeRefund.id,
        "payment.refundStatus": "pending",
        "payment.refundClaimedAt": claimTimestamp,
      },
    }
  );
  throw new ApiError(409, "Refund is already pending at the payment gateway; retry once settled");
};

const cancelPaidOrderWithRefundAndRestock = async (orderId, userId) => {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - REFUND_CLAIM_LEASE_MS);
  const claimUpdate = { $set: { "payment.refundStatus": "pending", "payment.refundClaimedAt": now } };

  // Atomically claim a fresh order or reclaim a stale pending refund claim after lease expiration
  let order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      ...baseQuery(),
      orderStatus: { $ne: "cancelled" },
      "payment.refundStatus": { $in: ["none", "failed", null] },
    },
    claimUpdate,
    { new: true }
  );

  let reclaimedStaleClaim = false;
  if (!order) {
    order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        ...baseQuery(),
        orderStatus: { $ne: "cancelled" },
        "payment.refundStatus": "pending",
        $or: [
          { "payment.refundClaimedAt": { $lte: staleBefore } },
          { "payment.refundClaimedAt": null },
          { "payment.refundClaimedAt": { $exists: false } },
        ],
      },
      claimUpdate,
      { new: true }
    );
    reclaimedStaleClaim = Boolean(order);
  }

  // Also allow retrying stock restoration if a prior attempt already completed the refund
  if (!order) {
    order = await Order.findOne({
      _id: orderId,
      orderStatus: { $ne: "cancelled" },
      "payment.status": { $in: ["paid", "refunded"] },
      "payment.refundStatus": "processed",
    });
  }

  if (!order) {
    const existing = await Order.findById(orderId);
    if (!existing || !["paid", "refunded", "refund_pending"].includes(existing.payment?.status)) {
      throw new ApiError(404, "Order not found");
    }
    if (existing.orderStatus === "cancelled") {
      throw new ApiError(409, "Order is already cancelled");
    }
    throw new ApiError(409, "Order cancellation is already in progress");
  }

  let refundId = order.payment?.refundId;
  let refundedAt = order.payment?.refundedAt;

  if (reclaimedStaleClaim && !refundId) {
    try {
      const reconciled = await reconcileExistingRefundsBeforeRetry(order, now);
      refundId = reconciled.refundId;
      refundedAt = reconciled.refundedAt;
    } catch (reconcileError) {
      if (!(reconcileError instanceof ApiError && reconcileError.statusCode === 409)) {
        await Order.updateOne(
          { _id: order._id, "payment.refundStatus": "pending" },
          {
            $set: {
              "payment.refundStatus": "failed",
              "payment.refundError": reconcileError.message || "Refund check failed",
              "payment.refundClaimedAt": null,
            },
          }
        );
      }
      throw reconcileError;
    }
  }

  // Step 1: Ensure payment refund completes before allowing cancellation
  if (!refundId) {
    if (!order.payment?.razorpayPaymentId) {
      await Order.updateOne(
        { _id: order._id, "payment.refundStatus": "pending" },
        {
          $set: {
            "payment.refundStatus": "failed",
            "payment.refundError": "Missing payment reference for refund",
            "payment.refundClaimedAt": null,
          },
        }
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
      await recordRefundSuccess(order._id, refundId, refundedAt);
    } catch (refundError) {
      await Order.updateOne(
        { _id: order._id, "payment.refundStatus": "pending" },
        {
          $set: {
            "payment.refundStatus": "failed",
            "payment.refundError": refundError.message || "Refund failed",
            "payment.refundClaimedAt": null,
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
    locked.fulfillmentRecoveryNeeded = false;
    locked.payment.status = "refunded";
    locked.payment.refundId = refundId;
    locked.payment.refundStatus = "processed";
    locked.payment.refundedAt = refundedAt || new Date();
    locked.payment.refundError = "";
    locked.payment.refundClaimedAt = null;
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
      {
        _id: req.params.id,
        ...baseQuery(),
        orderStatus: { $ne: "cancelled" },
        "payment.refundStatus": { $nin: ["pending", "processing", "processed"] },
      },
      { $set: { orderStatus: req.body.orderStatus } },
      { new: true, runValidators: true }
    );
    if (!order) {
      const existing = await Order.findById(req.params.id);
      if (
        existing &&
        (existing.orderStatus === "cancelled" ||
          existing.payment?.status === "refunded" ||
          existing.payment?.status === "refund_pending" ||
          ["pending", "processing", "processed"].includes(existing.payment?.refundStatus))
      ) {
        throw new ApiError(
          409,
          "Order cannot proceed to fulfillment because it is cancelled or has a refund in progress or completed"
        );
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
