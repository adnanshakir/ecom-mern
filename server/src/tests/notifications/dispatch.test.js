import { jest } from "@jest/globals";
import { createNotificationTestMocks, useFakeClock, waitFor } from "./_helpers.js";

await import("../../config/config.js");
delete process.env.FIREBASE_SERVICE_ACCOUNT_B64;
delete process.env.ENABLE_PUSH_STUB;

const mockCtrl = createNotificationTestMocks();

const { default: app } = await import("../../app.js");
const { dispatch, sendToTopic } = await import("../../services/notificationService.js");
const { default: User } = await import("../../models/admin/user.model.js");
const { default: Notification } = await import("../../models/Notification.js");
const { default: CustomerProfile } = await import("../../models/customer/customer.model.js");
const { default: Cart } = await import("../../models/customer/cart.model.js");
const { default: DeviceToken } = await import("../../models/DeviceToken.js");
const { default: Category } = await import("../../models/admin/category.model.js");
const { default: Brand } = await import("../../models/admin/brand.model.js");
const { default: Product } = await import("../../models/admin/product.model.js");
const { default: ProductVariant } = await import("../../models/admin/productVariant.model.js");
const { connectTestDB, closeTestDB, clearTestDB } = await import("../setup.js");
const { default: request } = await import("supertest");

beforeAll(async () => {
  await connectTestDB();
}, 30000);

beforeEach(async () => {
  mockCtrl.reset();
  await clearTestDB();
  process.env.NODE_ENV = "test";
  process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/test";
  delete process.env.ENABLE_PUSH_STUB;
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

afterAll(async () => {
  await closeTestDB();
});

describe("dispatch() and sendToTopic()", () => {
  it("routes channel=web without calling Firebase and sets tickerEndsAt = now + duration", async () => {
    const fixedNow = "2026-11-27T10:00:00.000Z";
    useFakeClock(fixedNow);

    const n = await Notification.create({
      title: "Web Banner",
      body: "Free shipping today",
      channel: "web",
      link: "/deals",
      tickerDurationHours: 12,
      status: "scheduled",
    });

    const res = await dispatch(n);
    expect(mockCtrl.mocks.sendMock).toHaveBeenCalledTimes(0);
    expect(res.status).toBe("sent");
    expect(res.result).toEqual({ ok: true });
    expect(res.sentAt.toISOString()).toBe(fixedNow);
    expect(res.tickerEndsAt.toISOString()).toBe(
      new Date(Date.parse(fixedNow) + 12 * 3600 * 1000).toISOString()
    );
    expect(res.claimExpiresAt).toBeUndefined();
  });

  it("routes channel=app to Firebase topic 'all' once and leaves tickerEndsAt unset", async () => {
    const fixedNow = "2026-11-27T11:00:00.000Z";
    useFakeClock(fixedNow);

    const n = await Notification.create({
      title: "App Only",
      body: "Tap to view",
      channel: "app",
      link: "/deals",
      imageUrl: "https://ik.imagekit.io/test/promo.jpg",
      status: "scheduled",
    });

    const res = await dispatch(n);
    expect(mockCtrl.mocks.sendMock).toHaveBeenCalledTimes(1);
    expect(mockCtrl.state.sendCalls[0]).toEqual({
      topic: "all",
      notification: {
        title: "App Only",
        body: "Tap to view",
        imageUrl: "https://ik.imagekit.io/test/promo.jpg?tr=w-800,h-400,fo-auto,q-70",
      },
      data: {
        link: "/deals",
        imageUrl: "https://ik.imagekit.io/test/promo.jpg?tr=w-800,h-400,fo-auto,q-70",
      },
      android: {
        priority: "high",
        notification: {
          channelId: "fibio_default",
          sound: "default",
          imageUrl: "https://ik.imagekit.io/test/promo.jpg?tr=w-800,h-400,fo-auto,q-70",
        },
      },
      apns: {
        payload: { aps: { sound: "default", mutableContent: true } },
        fcmOptions: {
          imageUrl: "https://ik.imagekit.io/test/promo.jpg?tr=w-800,h-400,fo-auto,q-70",
        },
      },
    });
    expect(res.status).toBe("sent");
    expect(res.tickerEndsAt).toBeUndefined();
    expect(res.sentAt.toISOString()).toBe(fixedNow);
  });

  it("routes channel=both to Firebase topic 'all' AND sets tickerEndsAt", async () => {
    const fixedNow = "2026-11-27T12:00:00.000Z";
    useFakeClock(fixedNow);

    const n = await Notification.create({
      title: "Both Channels",
      body: "Big sale",
      channel: "both",
      tickerDurationHours: 24,
      status: "scheduled",
    });

    const res = await dispatch(n);
    expect(mockCtrl.mocks.sendMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe("sent");
    expect(res.tickerEndsAt.toISOString()).toBe(
      new Date(Date.parse(fixedNow) + 24 * 3600 * 1000).toISOString()
    );
  });

  it("fails with stored error and no sentAt when Firebase is not configured and stub is off", async () => {
    mockCtrl.setConfigured(false);

    const n = await Notification.create({
      title: "No Firebase",
      channel: "app",
      status: "scheduled",
    });

    const res = await dispatch(n);
    expect(mockCtrl.mocks.sendMock).toHaveBeenCalledTimes(0);
    expect(res.status).toBe("failed");
    expect(res.sentAt).toBeUndefined();
    expect(res.claimExpiresAt).toBeUndefined();
    expect(res.result).toEqual({
      ok: false,
      error: "Push notifications disabled: Firebase is not configured",
    });

    await expect(sendToTopic({ title: "X" })).rejects.toThrow(
      "Push notifications disabled: Firebase is not configured"
    );
  });

  it("stores truncated error (max 300 chars) and clears claimExpiresAt when Firebase rejects; channel=both does not start ticker", async () => {
    const longErr = "E".repeat(450);
    mockCtrl.setSendHandler(async () => {
      throw new Error(longErr);
    });

    const n = await Notification.create({
      title: "Reject Test",
      channel: "both",
      status: "sending",
      claimExpiresAt: new Date(Date.now() + 60000),
    });

    const res = await dispatch(n);
    expect(mockCtrl.mocks.sendMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe("failed");
    expect(res.claimExpiresAt).toBeUndefined();
    expect(res.sentAt).toBeUndefined();
    // Current behavior: when Firebase fails on channel="both", ticker does not start
    expect(res.tickerEndsAt).toBeUndefined();
    expect(res.result.ok).toBe(false);
    expect(res.result.error).toBe("E".repeat(300));
    expect(res.result.error.length).toBe(300);
  });

  it("records exact segment stats and fails when withDevice=0", async () => {
    const cat = await Category.create({ name: "Tops", slug: "tops" });
    const brand = await Brand.create({ name: "B", slug: "b" });
    const prod = await Product.create({
      name: "Polo",
      slug: "polo",
      category: cat._id,
      brand: brand._id,
      status: "active",
    });
    const variant = await ProductVariant.create({
      product: prod._id,
      sku: "P-1",
      price: 500,
      stock: 5,
    });

    const c1 = await CustomerProfile.create({ authUserId: "a1", isActive: true });
    const c2 = await CustomerProfile.create({ authUserId: "a2", isActive: true });
    await Cart.create({ customer: c1._id, items: [{ variant: variant._id, quantity: 1 }] });
    await Cart.create({ customer: c2._id, items: [{ variant: variant._id, quantity: 1 }] });

    // 0 devices -> fails with documented message
    const nNoDev = await Notification.create({
      title: "Hi {{name}}",
      body: "{{product}}",
      channel: "app",
      audience: { type: "segment", segment: "cart" },
      status: "scheduled",
    });
    const failedRes = await dispatch(nNoDev);
    expect(failedRes.status).toBe("failed");
    expect(failedRes.stats).toEqual({ targeted: 2, withDevice: 0, delivered: 0, failed: 0 });
    expect(failedRes.result).toEqual({
      ok: false,
      error: "No customers in this audience have the app installed",
    });

    // Add token only for c1 -> targeted=2, withDevice=1, delivered=1, failed=0
    await DeviceToken.create({ customer: c1._id, token: "tok-c1" });
    const nOk = await Notification.create({
      title: "Hi {{name}}",
      body: "{{product}}",
      channel: "app",
      audience: { type: "segment", segment: "cart" },
      status: "scheduled",
    });
    const okRes = await dispatch(nOk);
    expect(okRes.status).toBe("sent");
    expect(okRes.stats).toEqual({ targeted: 2, withDevice: 1, delivered: 1, failed: 0 });
    expect(mockCtrl.mocks.sendEachMock).toHaveBeenCalledTimes(1);
  });

  it("processes segment audience > 2000 in background without holding HTTP request", async () => {
    await User.create({
      name: "Admin",
      email: "admin@test.com",
      password: "Test1234!",
      role: "admin",
    });
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@test.com", password: "Test1234!" });
    const adminToken = loginRes.body.data.accessToken;

    const cat = await Category.create({ name: "Cat", slug: "cat" });
    const brand = await Brand.create({ name: "Brand", slug: "brand" });
    const prod = await Product.create({
      name: "Tee",
      slug: "tee",
      category: cat._id,
      brand: brand._id,
      status: "active",
    });
    const variant = await ProductVariant.create({
      product: prod._id,
      sku: "T-1",
      price: 100,
      stock: 100,
    });

    const profiles = await CustomerProfile.insertMany(
      Array.from({ length: 2001 }, (_, i) => ({ authUserId: `bulk-u-${i}`, isActive: true }))
    );
    await Cart.insertMany(
      profiles.map((p) => ({ customer: p._id, items: [{ variant: variant._id, quantity: 1 }] }))
    );
    await DeviceToken.create({ customer: profiles[0]._id, token: "tok-bulk-0" });

    // Hold sendEach with a deferred promise to verify HTTP responds immediately with status="sending"
    let resolveSendEach;
    mockCtrl.setSendEachHandler(
      () =>
        new Promise((resolve) => {
          resolveSendEach = () =>
            resolve({
              successCount: 1,
              failureCount: 0,
              responses: [{ success: true, messageId: "m-1" }],
            });
        })
    );

    const res = await request(app)
      .post("/api/admin/notifications")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Bulk {{name}}",
        body: "Check {{product}}",
        audience: { type: "segment", segment: "cart" },
        sendNow: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.notification.status).toBe("sending");

    await waitFor(() => {
      expect(mockCtrl.mocks.sendEachMock).toHaveBeenCalledTimes(1);
    });
    resolveSendEach();
    await waitFor(async () => {
      const updated = await Notification.findById(res.body.notification._id).lean();
      expect(updated.status).toBe("sent");
    });

    const updated = await Notification.findById(res.body.notification._id).lean();
    expect(updated.status).toBe("sent");
    expect(updated.stats).toEqual({ targeted: 2001, withDevice: 1, delivered: 1, failed: 0 });
  });

  it("enforces idempotency: 5 concurrent dispatch() calls produce exactly 1 Firebase send", async () => {
    const n = await Notification.create({
      title: "Idempotent",
      body: "Once only",
      channel: "app",
      status: "scheduled",
    });

    const results = await Promise.all([
      dispatch(n),
      dispatch(n),
      dispatch(n),
      dispatch(n),
      dispatch(n),
    ]);

    expect(mockCtrl.mocks.sendMock).toHaveBeenCalledTimes(1);
    const dbDoc = await Notification.findById(n._id).lean();
    expect(dbDoc.status).toBe("sent");
    expect(results).toHaveLength(5);
  });

  it("applies custom imageUrl and autoImage fallback in segment dispatch", async () => {
    const cat = await Category.create({ name: "SegCat", slug: "seg-cat" });
    const brand = await Brand.create({ name: "B", slug: "b" });
    const prod = await Product.create({
      name: "Polo",
      slug: "polo-seg",
      category: cat._id,
      brand: brand._id,
      status: "active",
      images: [{ url: "https://ik.imagekit.io/test/polo-seg.jpg" }],
    });
    const variant = await ProductVariant.create({
      product: prod._id,
      sku: "PS-1",
      price: 500,
      stock: 5,
    });
    const c1 = await CustomerProfile.create({ authUserId: "sc1", isActive: true });
    await Cart.create({ customer: c1._id, items: [{ variant: variant._id, quantity: 1 }] });
    await DeviceToken.create({ customer: c1._id, token: "tok-sc1" });

    // Custom imageUrl wins over personalImage and autoImage
    const nCustom = await Notification.create({
      title: "Custom Seg",
      channel: "app",
      link: "/product/polo-seg",
      imageUrl: "https://cdn.example.com/custom-seg.png",
      personalImage: true,
      audience: { type: "segment", segment: "cart" },
      status: "scheduled",
    });
    await dispatch(nCustom);
    expect(mockCtrl.state.sendEachCalls[0][0].notification.imageUrl).toBe(
      "https://cdn.example.com/custom-seg.png"
    );

    // personalImage: false + autoImage: true resolves /product/polo-seg and stores on DB doc
    const nAuto = await Notification.create({
      title: "Auto Seg",
      channel: "app",
      link: "/product/polo-seg",
      personalImage: false,
      autoImage: true,
      audience: { type: "segment", segment: "cart" },
      status: "scheduled",
    });
    const resAuto = await dispatch(nAuto);
    expect(resAuto.imageUrl).toBe("https://ik.imagekit.io/test/polo-seg.jpg");
    expect(mockCtrl.state.sendEachCalls[1][0].notification.imageUrl).toBe(
      "https://ik.imagekit.io/test/polo-seg.jpg?tr=w-800,h-400,fo-auto,q-70"
    );
  });
});
