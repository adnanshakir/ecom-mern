import mongoose from "mongoose";
import Order from "../../models/customer/order.model.js";
import CustomerProfile from "../../models/customer/customer.model.js";
import ApiError from "../../utils/apiError.js";

const STATUSES = ["placed", "packed", "shipped", "delivered", "cancelled"];

const customerDetails = async (orders) => {
  const profiles = orders.map((order) => order.customer).filter(Boolean);
  const authIds = profiles.map((profile) => profile.authUserId).filter(Boolean);
  const users = await mongoose.connection.db
    .collection("customerUser")
    .find({ $or: [{ id: { $in: authIds } }, { _id: { $in: authIds } }] })
    .project({ name: 1, email: 1, phoneNumber: 1 })
    .toArray();
  const byAuthId = new Map(users.map((user) => [String(user.id || user._id), user]));
  return orders.map((order) => {
    const profile = order.customer;
    const user = byAuthId.get(profile?.authUserId);
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
      const matchingProfiles = await CustomerProfile.find({ authUserId: { $in: (await mongoose.connection.db.collection("customerUser").find({ $or: [{ name: regex }, { email: regex }, { phoneNumber: regex }] }).project({ id: 1, _id: 1 }).toArray()).flatMap((user) => [user.id, String(user._id)]) } }).select("_id");
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
      Order.find({ ...baseQuery(), createdAt: { $gte: start } }).select("total"),
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
    const order = await Order.findOne({ _id: req.params.id, ...baseQuery() }).populate("customer");
    if (!order) throw new ApiError(404, "Order not found");
    res.json({ success: true, data: (await customerDetails([order]))[0] });
  } catch (error) {
    next(error);
  }
};

export const updateAdminOrderStatus = async (req, res, next) => {
  try {
    if (!STATUSES.includes(req.body.orderStatus)) throw new ApiError(400, "Invalid order status");
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, ...baseQuery() },
      { $set: { orderStatus: req.body.orderStatus } },
      { new: true, runValidators: true }
    );
    if (!order) throw new ApiError(404, "Order not found");
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const markAdminOrderSeen = async (req, res, next) => {
  try {
    const order = await Order.findOneAndUpdate({ _id: req.params.id }, { $set: { adminSeen: true } }, { new: true });
    if (!order) throw new ApiError(404, "Order not found");
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};
