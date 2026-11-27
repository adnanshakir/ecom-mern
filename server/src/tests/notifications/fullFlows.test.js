import { jest } from "@jest/globals";
import request from "supertest";
import {
  createNotificationTestMocks,
  createAdminUser,
  createCustomerSession,
  useFakeClock,
  waitFor,
} from "./_helpers.js";

await import("../../config/config.js");
delete process.env.FIREBASE_SERVICE_ACCOUNT_B64;
delete process.env.ENABLE_PUSH_STUB;

const mockCtrl = createNotificationTestMocks();

const { default: app } = await import("../../app.js");
const { createCustomerAuth } = await import("../../config/customerAuth.js");
const { startNotificationScheduler } = await import("../../services/notificationService.js");
const { seedNotificationTemplates } = await import("../../seed/notificationTemplates.js");
const { default: User } = await import("../../models/admin/user.model.js");
const { default: Category } = await import("../../models/admin/category.model.js");
const { default: Brand } = await import("../../models/admin/brand.model.js");
const { default: Product } = await import("../../models/admin/product.model.js");
const { default: ProductVariant } = await import("../../models/admin/productVariant.model.js");
const { default: CustomerProfile } = await import("../../models/customer/customer.model.js");
const { default: Cart } = await import("../../models/customer/cart.model.js");
const { default: DeviceToken } = await import("../../models/DeviceToken.js");
const { default: Notification } = await import("../../models/Notification.js");
const { connectTestDB, closeTestDB, clearTestDB } = await import("../setup.js");

let adminToken;
let cat;
let brand;

beforeAll(async () => {
  await connectTestDB();
  await createCustomerAuth();
}, 30000);

beforeEach(async () => {
  mockCtrl.reset();
  await clearTestDB();
  await seedNotificationTemplates();
  process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/test";
  process.env.NODE_ENV = "test";
  delete process.env.ENABLE_PUSH_STUB;
  delete process.env.DISABLE_SCHEDULER;

  const admin = await createAdminUser(User, app, { role: "admin", email: "admin@test.com" });
  adminToken = admin.token;
  cat = await Category.create({ name: "Apparel", slug: "apparel" });
  brand = await Brand.create({ name: "Fibio", slug: "fibio" });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

afterAll(async () => {
  await closeTestDB();
});

describe("Full end-to-end notification flows", () => {
  it("creates custom template, broadcasts to everyone, appears in History and public ticker, and disappears when ticker ends", async () => {
    const tplRes = await request(app)
      .post("/api/admin/notification-templates")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Diwali Special",
        type: "festive",
        channel: "both",
        titleTpl: "Diwali {{discount}}% Off",
        bodyTpl: "Shop now",
      });
    expect(tplRes.status).toBe(201);

    const sendRes = await request(app)
      .post("/api/admin/notifications")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Diwali 30% Off",
        body: "Shop now",
        type: "festive",
        channel: "both",
        link: "/category/apparel",
        sendNow: true,
      });
    expect(sendRes.status).toBe(201);
    const notifId = sendRes.body.notification._id;
    expect(mockCtrl.mocks.sendMock).toHaveBeenCalledTimes(1);

    const histRes = await request(app)
      .get("/api/admin/notifications")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(histRes.status).toBe(200);
    expect(histRes.body.notifications).toHaveLength(1);
    expect(histRes.body.notifications[0].isTickerLive).toBe(true);

    const pub1 = await request(app).get("/api/public/ticker");
    expect(pub1.status).toBe(200);
    expect(pub1.body.items).toHaveLength(1);
    expect(pub1.body.items[0].text).toBe("Diwali 30% Off — Shop now");

    const endRes = await request(app)
      .patch(`/api/admin/notifications/${notifId}/end-ticker`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(endRes.status).toBe(200);

    const pub2 = await request(app).get("/api/public/ticker");
    expect(pub2.status).toBe(200);
    expect(pub2.body.items).toHaveLength(0);
  });

  it("schedules for 2 minutes, advances clock, ticks scheduler twice, and sends exactly once", async () => {
    useFakeClock("2026-11-27T10:00:00.000Z");
    startNotificationScheduler();
    const tick = mockCtrl.state.cronJobs[0].cb;

    const schedRes = await request(app)
      .post("/api/admin/notifications")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Scheduled Push",
        channel: "app",
        sendNow: false,
        scheduledAt: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
      });
    expect(schedRes.status).toBe(201);
    expect(schedRes.body.notification.status).toBe("scheduled");

    jest.setSystemTime(new Date(Date.now() + 2 * 60 * 1000 + 1000));
    await tick();
    await tick();

    expect(mockCtrl.mocks.sendMock).toHaveBeenCalledTimes(1);
    const dbNotif = await Notification.findById(schedRes.body.notification._id).lean();
    expect(dbNotif.status).toBe("sent");
  });

  it("customer registers token, wishlists product, restock sends once; customer unregisters token, restock sends nothing", async () => {
    const cust = await createCustomerSession(app, CustomerProfile, {
      phoneNumber: "+919876543299",
      name: "Meera",
    });

    const regRes = await request(app)
      .post("/api/customer/devices")
      .set("Cookie", cust.cookies)
      .send({ token: "tok-meera", platform: "android" });
    expect(regRes.status).toBe(200);

    const prod = await Product.create({
      name: "Silk Scarf",
      slug: "silk-scarf",
      category: cat._id,
      brand: brand._id,
      status: "active",
      images: [{ url: "https://ik.imagekit.io/test/scarf.jpg" }],
    });
    const variant = await ProductVariant.create({
      product: prod._id,
      sku: "SS-1",
      price: 600,
      stock: 0,
    });

    const wishRes = await request(app)
      .post("/api/customers/wishlist/items")
      .set("Cookie", cust.cookies)
      .send({ productId: prod._id });
    expect(wishRes.status).toBe(200);

    // Restock 0 -> 5
    const r1 = await request(app)
      .post("/api/inventory/movements")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ variantId: variant._id, type: "restock", quantity: 5, reason: "Arrived" });
    expect(r1.status).toBe(201);
    await waitFor(() => {
      expect(mockCtrl.mocks.sendEachForMulticastMock).toHaveBeenCalledTimes(1);
    });
    expect(mockCtrl.state.multicastCalls[0].tokens).toEqual(["tok-meera"]);
    expect(mockCtrl.state.multicastCalls[0].data.link).toBe("/product/silk-scarf");

    // Unregister token, drop stock to 0, restock again -> nothing sent
    const unregRes = await request(app)
      .delete("/api/customer/devices")
      .set("Cookie", cust.cookies)
      .send({ token: "tok-meera" });
    expect(unregRes.status).toBe(200);

    await ProductVariant.updateOne({ _id: variant._id }, { $set: { stock: 0 } });
    const r2 = await request(app)
      .post("/api/inventory/movements")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ variantId: variant._id, type: "restock", quantity: 5, reason: "Arrived again" });
    expect(r2.status).toBe(201);
    await waitFor(async () => {
      const updatedVar = await ProductVariant.findById(variant._id).lean();
      expect(updatedVar.stock).toBe(5);
    });
    expect(mockCtrl.mocks.sendEachForMulticastMock).toHaveBeenCalledTimes(1);
  });

  it("segment campaign 'cart' with personalImage sends per-customer images and counts customers without app in targeted only", async () => {
    const p1 = await Product.create({
      name: "Item One",
      slug: "item-one",
      category: cat._id,
      brand: brand._id,
      status: "active",
      images: [{ url: "https://ik.imagekit.io/test/i1.jpg" }],
    });
    const v1 = await ProductVariant.create({ product: p1._id, sku: "I1", price: 500, stock: 5 });

    const p2 = await Product.create({
      name: "Item Two",
      slug: "item-two",
      category: cat._id,
      brand: brand._id,
      status: "active",
      images: [{ url: "https://ik.imagekit.io/test/i2.jpg" }],
    });
    const v2 = await ProductVariant.create({ product: p2._id, sku: "I2", price: 700, stock: 5 });

    const c1 = await CustomerProfile.create({ authUserId: "ff-1", isActive: true });
    const c2 = await CustomerProfile.create({ authUserId: "ff-2", isActive: true });
    const cNoApp = await CustomerProfile.create({ authUserId: "ff-3", isActive: true });

    await DeviceToken.create({ customer: c1._id, token: "tok-ff1" });
    await DeviceToken.create({ customer: c2._id, token: "tok-ff2" });
    await Cart.create({ customer: c1._id, items: [{ variant: v1._id, quantity: 1 }] });
    await Cart.create({ customer: c2._id, items: [{ variant: v2._id, quantity: 1 }] });
    await Cart.create({ customer: cNoApp._id, items: [{ variant: v1._id, quantity: 1 }] });

    const res = await request(app)
      .post("/api/admin/notifications")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Grab {{product}}",
        body: "{{count}} item waiting",
        audience: { type: "segment", segment: "cart" },
        personalImage: true,
        sendNow: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.notification.stats).toEqual({
      targeted: 3,
      withDevice: 2,
      delivered: 2,
      failed: 0,
    });
    const msgs = mockCtrl.state.sendEachCalls[0];
    expect(msgs).toHaveLength(2);
    const byTok = new Map(msgs.map((m) => [m.token, m]));
    expect(byTok.get("tok-ff1").notification.imageUrl).toBe(
      "https://ik.imagekit.io/test/i1.jpg?tr=w-800,h-400,fo-auto,q-70"
    );
    expect(byTok.get("tok-ff2").notification.imageUrl).toBe(
      "https://ik.imagekit.io/test/i2.jpg?tr=w-800,h-400,fo-auto,q-70"
    );
  });

  it("handles Firebase down across every send path with stored failures and zero unhandled rejections", async () => {
    const unhandled = [];
    const onUnhandled = (err) => unhandled.push(err);
    process.on("unhandledRejection", onUnhandled);

    try {
      mockCtrl.setConfigured(false);

      const p = await Product.create({
        name: "Coat",
        slug: "coat",
        category: cat._id,
        brand: brand._id,
        status: "active",
        images: [{ url: "https://ik.imagekit.io/test/coat.jpg" }],
      });
      const v = await ProductVariant.create({ product: p._id, sku: "C-1", price: 1000, stock: 5 });
      const cust = await CustomerProfile.create({ authUserId: "down-1", isActive: true });
      await DeviceToken.create({ customer: cust._id, token: "tok-down" });
      await Cart.create({ customer: cust._id, items: [{ variant: v._id, quantity: 1 }] });

      // 1) Topic broadcast
      const topicRes = await request(app)
        .post("/api/admin/notifications")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "Down Topic", channel: "app", sendNow: true });
      expect(topicRes.status).toBe(201);
      expect(topicRes.body.notification.status).toBe("failed");
      expect(topicRes.body.notification.sentAt).toBeUndefined();
      expect(topicRes.body.notification.result).toEqual({
        ok: false,
        error: "Push notifications disabled: Firebase is not configured",
      });

      // 2) Segment campaign
      const segRes = await request(app)
        .post("/api/admin/notifications")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Down Seg",
          audience: { type: "segment", segment: "cart" },
          sendNow: true,
        });
      expect(segRes.status).toBe(201);
      expect(segRes.body.notification.status).toBe("failed");
      expect(segRes.body.notification.sentAt).toBeUndefined();
      expect(segRes.body.notification.result).toEqual({
        ok: false,
        error: "Push notifications disabled: Firebase is not configured",
      });

      // 3) Restock trigger (with Firebase throwing)
      mockCtrl.setConfigured(true);
      mockCtrl.setMulticastHandler(async () => {
        throw new Error("503 Service Unavailable");
      });
      await ProductVariant.updateOne({ _id: v._id }, { $set: { stock: 0 } });
      const stockRes = await request(app)
        .post("/api/inventory/movements")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ variantId: v._id, type: "restock", quantity: 3, reason: "Test" });
      expect(stockRes.status).toBe(201);

      await waitFor(async () => {
        const updated = await ProductVariant.findById(v._id).lean();
        expect(updated.stock).toBe(3);
      });
      expect(await Notification.countDocuments({ status: "sent" })).toBe(0);
      expect(unhandled).toHaveLength(0);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });
});
