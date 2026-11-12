import crypto from "crypto";
import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import app from "../app.js";
import User from "../models/admin/user.model.js";
import Brand from "../models/admin/brand.model.js";
import Category from "../models/admin/category.model.js";
import Product from "../models/admin/product.model.js";
import ProductVariant from "../models/admin/productVariant.model.js";
import InventoryMovement from "../models/admin/inventoryMovement.model.js";
import CustomerProfile from "../models/customer/customer.model.js";
import Order from "../models/customer/order.model.js";
import Cart from "../models/customer/cart.model.js";
import { createCustomerAuth } from "../config/customerAuth.js";
import { generateAccessToken } from "../utils/token.js";
import { connectTestDB, closeTestDB, clearTestDB } from "./setup.js";

let adminToken;
let staffToken;
let adminUser;
let customerCookies;
let customerProfile;
let customerUserId;
let addressId;
let variantA;
let variantB;

const originalFetch = global.fetch;
const origKeyId = process.env.RAZORPAY_KEY_ID;
const origKeySecret = process.env.RAZORPAY_KEY_SECRET;

const signRazorpay = (orderId, paymentId) =>
  crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

beforeAll(async () => {
  await connectTestDB();
  await createCustomerAuth();
});

afterAll(async () => {
  global.fetch = originalFetch;
  if (origKeyId !== undefined) process.env.RAZORPAY_KEY_ID = origKeyId;
  else delete process.env.RAZORPAY_KEY_ID;
  if (origKeySecret !== undefined) process.env.RAZORPAY_KEY_SECRET = origKeySecret;
  else delete process.env.RAZORPAY_KEY_SECRET;
  await closeTestDB();
});

beforeEach(async () => {
  process.env.RAZORPAY_KEY_ID = "rzp_test_key";
  process.env.RAZORPAY_KEY_SECRET = "rzp_test_secret";

  adminUser = await User.create({
    name: "Admin User",
    email: "admin-orders@test.com",
    password: "Password123!",
    role: "admin",
  });
  adminToken = generateAccessToken(adminUser);

  const staffUser = await User.create({
    name: "Staff User",
    email: "staff-orders@test.com",
    password: "Password123!",
    role: "staff",
  });
  staffToken = generateAccessToken(staffUser);

  const phone = "+919876500111";
  await request(app)
    .post("/api/v1/customers/auth/phone-number/send-otp")
    .set("Origin", "http://localhost:3000")
    .send({ phoneNumber: phone });

  const db = mongoose.connection.db;
  const verDoc = await db.collection("customerVerification").findOne({ identifier: phone });
  const code = verDoc?.value?.split(":")[0];
  const verifyRes = await request(app)
    .post("/api/v1/customers/auth/phone-number/verify")
    .set("Origin", "http://localhost:3000")
    .send({ phoneNumber: phone, code });

  customerCookies = verifyRes.headers["set-cookie"];
  customerUserId = verifyRes.body.user.id;

  customerProfile = await CustomerProfile.create({
    authUserId: customerUserId,
    addresses: [
      {
        label: "Warehouse",
        line1: "42 Market Road",
        city: "Mumbai",
        state: "MH",
        postalCode: "400001",
        country: "India",
        phone,
        isDefault: true,
      },
    ],
  });
  addressId = customerProfile.addresses[0]._id.toString();

  const category = await Category.create({ name: "Apparel", slug: "apparel" });
  const brand = await Brand.create({ name: "Fibio", slug: "fibio" });
  const product = await Product.create({
    name: "Heavyweight Hoodie",
    slug: "heavyweight-hoodie",
    description: "Warm fleece wholesale hoodie.",
    category: category._id,
    brand: brand._id,
    status: "active",
  });

  variantA = await ProductVariant.create({
    product: product._id,
    sku: "HOODIE-BLK-L",
    price: 1000,
    stock: 10,
    isActive: true,
  });

  variantB = await ProductVariant.create({
    product: product._id,
    sku: "HOODIE-NVY-M",
    price: 800,
    stock: 2,
    isActive: true,
  });

  await Cart.create({
    customer: customerProfile._id,
    items: [
      { variant: variantA._id, quantity: 2 },
      { variant: variantB._id, quantity: 2 },
    ],
  });
});

afterEach(async () => {
  global.fetch = originalFetch;
  await clearTestDB();
  jest.restoreAllMocks();
});

describe("Checkout Idempotency, Receipt Uniqueness & Capture Guarantees", () => {
  it("creates only one Order and one Razorpay gateway order on repeated or concurrent idempotency key calls", async () => {
    let razorpayCalls = 0;
    const seenReceipts = [];

    global.fetch = jest.fn(async (url, opts) => {
      if (url === "https://api.razorpay.com/v1/orders") {
        razorpayCalls += 1;
        const body = JSON.parse(opts.body);
        seenReceipts.push(body.receipt);
        await new Promise((r) => setTimeout(r, 40));
        return {
          ok: true,
          json: async () => ({
            id: `order_rzp_${razorpayCalls}`,
            amount: body.amount,
            currency: "INR",
            receipt: body.receipt,
          }),
        };
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const idempotencyKey = "idem-checkout-concurrent-001";
    const [res1, res2, res3] = await Promise.all([
      request(app)
        .post("/api/customers/payments/orders")
        .set("Cookie", customerCookies)
        .set("Idempotency-Key", idempotencyKey)
        .send({ addressId }),
      request(app)
        .post("/api/customers/payments/orders")
        .set("Cookie", customerCookies)
        .set("Idempotency-Key", idempotencyKey)
        .send({ addressId }),
      request(app)
        .post("/api/customers/payments/orders")
        .set("Cookie", customerCookies)
        .send({ addressId, idempotencyKey }),
    ]);

    expect([200, 201]).toContain(res1.status);
    expect([200, 201]).toContain(res2.status);
    expect([200, 201]).toContain(res3.status);
    expect(res1.body.data.razorpayOrderId).toBe("order_rzp_1");
    expect(res2.body.data.razorpayOrderId).toBe("order_rzp_1");
    expect(res3.body.data.razorpayOrderId).toBe("order_rzp_1");
    expect(res1.body.data.orderId).toBe(res2.body.data.orderId);
    expect(res1.body.data.orderId).toBe(res3.body.data.orderId);
    expect(razorpayCalls).toBe(1);
    expect(seenReceipts[0].length).toBeGreaterThanOrEqual(20);
    expect(seenReceipts[0].length).toBeLessThanOrEqual(40);

    const dbCount = await Order.countDocuments({ customer: customerProfile._id });
    expect(dbCount).toBe(1);
  });

  it("retries Order.create with a fresh receipt on orderNumber uniqueness collision before calling Razorpay", async () => {
    const receiptsSent = [];
    const origCreate = Order.create.bind(Order);
    let createCalls = 0;

    jest.spyOn(Order, "create").mockImplementation(async (doc) => {
      createCalls += 1;
      if (createCalls === 1) {
        const dupErr = new Error("E11000 duplicate key error collection: orders index: orderNumber_1");
        dupErr.code = 11000;
        dupErr.keyPattern = { orderNumber: 1 };
        throw dupErr;
      }
      return origCreate(doc);
    });

    global.fetch = jest.fn(async (url, opts) => {
      if (url === "https://api.razorpay.com/v1/orders") {
        const body = JSON.parse(opts.body);
        receiptsSent.push(body.receipt);
        return {
          ok: true,
          json: async () => ({ id: "order_rzp_retry_ok", amount: body.amount, currency: "INR" }),
        };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const res = await request(app)
      .post("/api/customers/payments/orders")
      .set("Cookie", customerCookies)
      .send({ addressId });

    expect(res.status).toBe(201);
    expect(createCalls).toBe(2);
    expect(receiptsSent).toHaveLength(1);
    expect(res.body.data.razorpayOrderId).toBe("order_rzp_retry_ok");
  });

  it("verifyPayment and reconcilePayment refuse to mark authorized (non-captured) payments as paid", async () => {
    const rzpOrderId = "order_auth_only_1";
    const rzpPaymentId = "pay_auth_only_1";

    global.fetch = jest.fn(async (url, opts) => {
      if (url === "https://api.razorpay.com/v1/orders") {
        const body = JSON.parse(opts.body);
        return {
          ok: true,
          json: async () => ({ id: rzpOrderId, amount: body.amount, currency: "INR" }),
        };
      }
      if (url === `https://api.razorpay.com/v1/payments/${rzpPaymentId}`) {
        return {
          ok: true,
          json: async () => ({
            id: rzpPaymentId,
            order_id: rzpOrderId,
            status: "authorized",
            amount: (2 * 1000 + 2 * 800 + 100) * 100,
          }),
        };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const createRes = await request(app)
      .post("/api/customers/payments/orders")
      .set("Cookie", customerCookies)
      .send({ addressId });
    expect(createRes.status).toBe(201);

    // 1. verifyPayment receives valid signature, but Razorpay says status: "authorized" (not captured)
    const verifyRes = await request(app)
      .post("/api/customers/payments/verify")
      .set("Cookie", customerCookies)
      .send({
        razorpay_order_id: rzpOrderId,
        razorpay_payment_id: rzpPaymentId,
        razorpay_signature: signRazorpay(rzpOrderId, rzpPaymentId),
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.status).toBe("pending");

    let orderInDb = await Order.findById(createRes.body.data.orderId);
    expect(orderInDb.payment.status).toBe("pending");
    expect((await ProductVariant.findById(variantA._id)).stock).toBe(10);

    // 2. reconcilePayment ALSO retains pending for "authorized"
    const reconAuthRes = await request(app)
      .post("/api/customers/payments/reconcile")
      .set("Cookie", customerCookies)
      .send({ razorpayOrderId: rzpOrderId, razorpayPaymentId: rzpPaymentId });

    expect(reconAuthRes.status).toBe(200);
    expect(reconAuthRes.body.data.status).toBe("pending");
    orderInDb = await Order.findById(createRes.body.data.orderId);
    expect(orderInDb.payment.status).toBe("pending");

    // 3. Gateway later confirms "captured" -> reconcile marks paid, deducts stock, records paidAt
    global.fetch = jest.fn(async (url) => {
      if (url === `https://api.razorpay.com/v1/payments/${rzpPaymentId}`) {
        return {
          ok: true,
          json: async () => ({
            id: rzpPaymentId,
            order_id: rzpOrderId,
            status: "captured",
            amount: (2 * 1000 + 2 * 800 + 100) * 100,
          }),
        };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const reconCapturedRes = await request(app)
      .post("/api/customers/payments/reconcile")
      .set("Cookie", customerCookies)
      .send({ razorpayOrderId: rzpOrderId, razorpayPaymentId: rzpPaymentId });

    expect(reconCapturedRes.status).toBe(200);
    expect(reconCapturedRes.body.data.status).toBe("paid");
    orderInDb = await Order.findById(createRes.body.data.orderId);
    expect(orderInDb.payment.status).toBe("paid");
    expect(orderInDb.payment.paidAt).toBeTruthy();
    expect(orderInDb.stockDeducted).toBe(true);
    expect((await ProductVariant.findById(variantA._id)).stock).toBe(8);
    expect((await ProductVariant.findById(variantB._id)).stock).toBe(0);
  });

  it("handles post-checkout stock drop without partial stock deduction, records durable refund_pending -> refunded recovery, and surfaces order in getCustomerOrders", async () => {
    const rzpOrderId = "order_stock_drop_1";
    const rzpPaymentId = "pay_stock_drop_1";
    const totalPaise = (2 * 1000 + 2 * 800 + 100) * 100;
    let refundShouldFail = true;

    global.fetch = jest.fn(async (url, opts) => {
      if (url === "https://api.razorpay.com/v1/orders") {
        return { ok: true, json: async () => ({ id: rzpOrderId, amount: totalPaise, currency: "INR" }) };
      }
      if (url === `https://api.razorpay.com/v1/payments/${rzpPaymentId}`) {
        return {
          ok: true,
          json: async () => ({ id: rzpPaymentId, order_id: rzpOrderId, status: "captured", amount: totalPaise }),
        };
      }
      if (url === `https://api.razorpay.com/v1/payments/${rzpPaymentId}/refund`) {
        if (refundShouldFail) {
          return { ok: false, status: 502 };
        }
        return { ok: true, json: async () => ({ id: "rfnd_auto_001", amount: totalPaise }) };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const createRes = await request(app)
      .post("/api/customers/payments/orders")
      .set("Cookie", customerCookies)
      .send({ addressId });
    expect(createRes.status).toBe(201);

    // Another customer consumes variantB stock before capture completes (variantA still has 10)
    await ProductVariant.updateOne({ _id: variantB._id }, { $set: { stock: 1 } });

    const verifyRes = await request(app)
      .post("/api/customers/payments/verify")
      .set("Cookie", customerCookies)
      .send({
        razorpay_order_id: rzpOrderId,
        razorpay_payment_id: rzpPaymentId,
        razorpay_signature: signRazorpay(rzpOrderId, rzpPaymentId),
      });

    expect(verifyRes.status).toBe(200);
    // Refund API failed transiently -> durable refund_pending recorded, NO partial deduction on variantA!
    expect(verifyRes.body.data.status).toBe("refund_pending");
    expect((await ProductVariant.findById(variantA._id)).stock).toBe(10);
    expect((await ProductVariant.findById(variantB._id)).stock).toBe(1);

    const pendingRecoveryOrder = await Order.findById(createRes.body.data.orderId);
    expect(pendingRecoveryOrder.payment.status).toBe("refund_pending");
    expect(pendingRecoveryOrder.payment.razorpayPaymentId).toBe(rzpPaymentId);
    expect(pendingRecoveryOrder.fulfillmentRecoveryNeeded).toBe(true);
    expect(pendingRecoveryOrder.stockDeducted).toBe(false);

    // Customer CAN see their order in getCustomerOrders (never hidden in pending limbo)
    const customerOrdersBefore = await request(app)
      .get("/api/customers/payments/orders")
      .set("Cookie", customerCookies);
    expect(customerOrdersBefore.status).toBe(200);
    expect(customerOrdersBefore.body.data).toHaveLength(1);
    expect(customerOrdersBefore.body.data[0].payment.status).toBe("refund_pending");

    // Reconciliation retries automatic refund once gateway recovers
    refundShouldFail = false;
    const reconRes = await request(app)
      .post("/api/customers/payments/reconcile")
      .set("Cookie", customerCookies)
      .send({ razorpayOrderId: rzpOrderId, razorpayPaymentId: rzpPaymentId });

    expect(reconRes.status).toBe(200);
    expect(reconRes.body.data.status).toBe("refunded");

    const refundedOrder = await Order.findById(createRes.body.data.orderId);
    expect(refundedOrder.payment.status).toBe("refunded");
    expect(refundedOrder.payment.refundId).toBe("rfnd_auto_001");
    expect(refundedOrder.payment.refundStatus).toBe("processed");
    expect(refundedOrder.fulfillmentRecoveryNeeded).toBe(false);
    expect(refundedOrder.orderStatus).toBe("cancelled");
  });
});

describe("Admin Orders RBAC, Stats paidAt, Visibility, Lookup & Cancel Refund/Restock", () => {
  const seedPaidOrder = async ({
    orderNumber = "ORD-20261112-ADMIN1",
    paymentStatus = "paid",
    paidAt = new Date(),
    createdAt = new Date(),
    variantBStockAfterSale = 0,
  } = {}) => {
    await ProductVariant.updateOne({ _id: variantA._id }, { $set: { stock: 8 } });
    await ProductVariant.updateOne({ _id: variantB._id }, { $set: { stock: variantBStockAfterSale } });

    const doc = await Order.create({
      orderNumber,
      customer: customerProfile._id,
      items: [
        { product: variantA.product, variantId: variantA._id, name: "Heavyweight Hoodie", quantity: 2, unitPrice: 1000 },
        { product: variantB.product, variantId: variantB._id, name: "Heavyweight Hoodie", quantity: 2, unitPrice: 800 },
      ],
      shippingAddress: {
        fullName: "Test Buyer",
        phone: "+919876500111",
        line1: "42 Market Road",
        city: "Mumbai",
        postalCode: "400001",
      },
      subtotal: 3600,
      shipping: 100,
      total: 3700,
      payment: {
        method: "razorpay",
        status: paymentStatus,
        razorpayOrderId: `rzp_ord_${orderNumber}`,
        razorpayPaymentId: paymentStatus === "paid" ? `pay_${orderNumber}` : undefined,
        paidAt: paymentStatus === "paid" ? paidAt : undefined,
      },
      stockDeducted: paymentStatus === "paid",
    });

    if (createdAt) {
      await mongoose.connection.db
        .collection("orders")
        .updateOne({ _id: doc._id }, { $set: { createdAt } });
    }
    return Order.findById(doc._id);
  };

  it("restricts PATCH status and seen mutations to admin/super_admin while allowing staff reads", async () => {
    const order = await seedPaidOrder();

    // Staff CAN read stats, list, detail
    expect((await request(app).get("/api/orders/stats").set("Authorization", `Bearer ${staffToken}`)).status).toBe(200);
    expect((await request(app).get("/api/orders").set("Authorization", `Bearer ${staffToken}`)).status).toBe(200);
    expect((await request(app).get(`/api/orders/${order._id}`).set("Authorization", `Bearer ${staffToken}`)).status).toBe(200);

    // Staff CANNOT mutate status or seen
    const statusRes = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ orderStatus: "packed" });
    expect(statusRes.status).toBe(403);

    const seenRes = await request(app)
      .patch(`/api/orders/${order._id}/seen`)
      .set("Authorization", `Bearer ${staffToken}`);
    expect(seenRes.status).toBe(403);

    // Admin CAN update non-cancel status and mark seen
    const adminSeenRes = await request(app)
      .patch(`/api/orders/${order._id}/seen`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(adminSeenRes.status).toBe(200);
    expect(adminSeenRes.body.data.adminSeen).toBe(true);

    const adminPackRes = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ orderStatus: "packed" });
    expect(adminPackRes.status).toBe(200);
    expect(adminPackRes.body.data.orderStatus).toBe("packed");
  });

  it("uses payment.paidAt instead of createdAt for todayRevenue and todayCount", async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Created yesterday, paid today -> SHOULD count today
    await seedPaidOrder({
      orderNumber: "ORD-PAID-TODAY-1",
      createdAt: yesterday,
      paidAt: now,
    });
    // Created today, paid yesterday -> SHOULD NOT count today
    await seedPaidOrder({
      orderNumber: "ORD-PAID-YDAY-2",
      createdAt: now,
      paidAt: yesterday,
    });

    const statsRes = await request(app)
      .get("/api/orders/stats")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.data.todayCount).toBe(1);
    expect(statsRes.body.data.todayRevenue).toBe(3700);
  });

  it("allows inspecting pending and failed orders in detail lookup while blocking fulfillment updates on unpaid orders", async () => {
    const pendingOrder = await seedPaidOrder({ orderNumber: "ORD-PEND-1", paymentStatus: "pending" });
    const failedOrder = await seedPaidOrder({ orderNumber: "ORD-FAIL-1", paymentStatus: "failed" });

    // Listed when filtered by paymentStatus
    const listPending = await request(app)
      .get("/api/orders?paymentStatus=pending")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(listPending.status).toBe(200);
    expect(listPending.body.data.some((o) => o._id === pendingOrder._id.toString())).toBe(true);

    // Detail & invoice lookup succeeds for both pending and failed orders
    const detailPending = await request(app)
      .get(`/api/orders/${pendingOrder._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(detailPending.status).toBe(200);
    expect(detailPending.body.data.payment.status).toBe("pending");

    const detailFailed = await request(app)
      .get(`/api/orders/${failedOrder._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(detailFailed.status).toBe(200);
    expect(detailFailed.body.data.payment.status).toBe("failed");

    // Fulfillment status updates remain restricted for unpaid orders
    const updatePending = await request(app)
      .patch(`/api/orders/${pendingOrder._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ orderStatus: "packed" });
    expect(updatePending.status).toBe(404);
  });

  it("resolves customer details via customerUser.id projection even when id differs from Mongo _id", async () => {
    const customAuthId = "custom_auth_string_id_999";
    await mongoose.connection.db.collection("customerUser").insertOne({
      _id: new mongoose.Types.ObjectId(),
      id: customAuthId,
      name: "Projected Buyer",
      email: "projected@example.com",
      phoneNumber: "+919900011222",
    });

    const customProfile = await CustomerProfile.create({ authUserId: customAuthId });
    const order = await Order.create({
      orderNumber: "ORD-PROJ-1",
      customer: customProfile._id,
      items: [{ product: variantA.product, variantId: variantA._id, name: "Hoodie", quantity: 1, unitPrice: 1000 }],
      shippingAddress: { line1: "1 St", city: "Pune", postalCode: "411001" },
      subtotal: 1000,
      shipping: 100,
      total: 1100,
      payment: { method: "razorpay", status: "paid", razorpayPaymentId: "pay_proj_1", paidAt: new Date() },
    });

    const detailRes = await request(app)
      .get(`/api/orders/${order._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.customer.name).toBe("Projected Buyer");
    expect(detailRes.body.data.customer.email).toBe("projected@example.com");
    expect(detailRes.body.data.customer.phone).toBe("+919900011222");
  });

  it("blocks paid-order cancellation if refund fails or stock restoration fails, and completes both cleanly on success without double refunding", async () => {
    const order = await seedPaidOrder({ orderNumber: "ORD-CANCEL-1" });
    const payId = order.payment.razorpayPaymentId;

    // 1. Refund gateway fails -> cancellation MUST fail; status and stock stay unchanged
    global.fetch = jest.fn(async (url) => {
      if (url === `https://api.razorpay.com/v1/payments/${payId}/refund`) {
        return { ok: false, status: 502 };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const failRefundRes = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ orderStatus: "cancelled" });

    expect(failRefundRes.status).toBe(502);
    let current = await Order.findById(order._id);
    expect(current.orderStatus).toBe("placed");
    expect(current.payment.status).toBe("paid");
    expect((await ProductVariant.findById(variantA._id)).stock).toBe(8);

    // 2. Refund succeeds, but variantB was deleted causing stock restoration to fail ->
    //    transaction aborts (variantA NOT partially restored!), orderStatus STILL NOT cancelled, refundId preserved!
    await ProductVariant.deleteOne({ _id: variantB._id });
    let refundCalls = 0;
    global.fetch = jest.fn(async (url) => {
      if (url === `https://api.razorpay.com/v1/payments/${payId}/refund`) {
        refundCalls += 1;
        return { ok: true, json: async () => ({ id: "rfnd_cancel_1" }) };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const failRestockRes = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ orderStatus: "cancelled" });

    expect(failRestockRes.status).toBe(404);
    expect(refundCalls).toBe(1);
    current = await Order.findById(order._id);
    expect(current.orderStatus).toBe("placed");
    expect(current.payment.status).toBe("refunded");
    expect(current.payment.refundId).toBe("rfnd_cancel_1");
    expect(current.payment.refundStatus).toBe("processed");
    // variantA must NOT have been partially restored due to transaction abort
    expect((await ProductVariant.findById(variantA._id)).stock).toBe(8);

    // Successfully refunded order MUST be blocked from advancing to fulfillment
    const packAfterRefundRes = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ orderStatus: "packed" });
    expect(packAfterRefundRes.status).toBe(409);

    // 3. Recreate missing variant with original pre-restock _id and retry cancellation ->
    //    does NOT call Razorpay refund a second time; restores stock via adjustStock & marks cancelled + refunded!
    await ProductVariant.create({
      _id: variantB._id,
      product: variantB.product,
      sku: "HOODIE-NVY-M",
      price: 800,
      stock: 0,
      isActive: true,
    });

    const retryCancelRes = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ orderStatus: "cancelled" });

    expect(retryCancelRes.status).toBe(200);
    expect(refundCalls).toBe(1); // No duplicate refund!
    expect(retryCancelRes.body.data.orderStatus).toBe("cancelled");
    expect(retryCancelRes.body.data.payment.status).toBe("refunded");
    expect(retryCancelRes.body.data.stockRestored).toBe(true);

    expect((await ProductVariant.findById(variantA._id)).stock).toBe(10);
    expect((await ProductVariant.findById(variantB._id)).stock).toBe(2);

    const movements = await InventoryMovement.find({ reason: `Order cancelled: ${order.orderNumber}` });
    expect(movements).toHaveLength(2);
    expect(movements.every((m) => m.type === "return")).toBe(true);
  });

  it("reclaims stale pending refund claims only after lease expires and reconciles existing Razorpay refunds without duplicating them", async () => {
    const order = await seedPaidOrder({ orderNumber: "ORD-LEASE-1" });
    const payId = order.payment.razorpayPaymentId;

    // Fresh pending claim must reject concurrent cancel with 409
    await Order.updateOne(
      { _id: order._id },
      { $set: { "payment.refundStatus": "pending", "payment.refundClaimedAt": new Date() } }
    );
    const freshRes = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ orderStatus: "cancelled" });
    expect(freshRes.status).toBe(409);

    // Also block fulfillment while refund is in progress
    const freshPackRes = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ orderStatus: "packed" });
    expect(freshPackRes.status).toBe(409);

    // Expire lease and mock Razorpay returning an existing processed refund
    await Order.updateOne(
      { _id: order._id },
      { $set: { "payment.refundClaimedAt": new Date(Date.now() - 10 * 60 * 1000) } }
    );

    let refundCreateCalls = 0;
    global.fetch = jest.fn(async (url) => {
      if (url === `https://api.razorpay.com/v1/payments/${payId}/refunds`) {
        return {
          ok: true,
          json: async () => ({
            items: [{ id: "rfnd_existing_lease", status: "processed", created_at: 1730000000 }],
          }),
        };
      }
      if (url === `https://api.razorpay.com/v1/payments/${payId}/refund`) {
        refundCreateCalls += 1;
        return { ok: true, json: async () => ({ id: "rfnd_dup" }) };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const reclaimedRes = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ orderStatus: "cancelled" });

    expect(reclaimedRes.status).toBe(200);
    expect(refundCreateCalls).toBe(0);
    expect(reclaimedRes.body.data.payment.refundId).toBe("rfnd_existing_lease");
    expect(reclaimedRes.body.data.payment.status).toBe("refunded");
    expect(reclaimedRes.body.data.orderStatus).toBe("cancelled");
  });

  it("converts Razorpay fetch abort timeouts to 504 and resets refundStatus to failed so it is not stuck pending", async () => {
    const order = await seedPaidOrder({ orderNumber: "ORD-TIMEOUT-1" });
    global.fetch = jest.fn(async () => {
      const abortErr = new Error("The operation was aborted");
      abortErr.name = "AbortError";
      throw abortErr;
    });

    const timeoutRes = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ orderStatus: "cancelled" });

    expect(timeoutRes.status).toBe(504);
    const updated = await Order.findById(order._id);
    expect(updated.payment.refundStatus).toBe("failed");
    expect(updated.orderStatus).toBe("placed");
  });
});

