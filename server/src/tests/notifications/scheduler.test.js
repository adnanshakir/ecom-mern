import { jest } from "@jest/globals";
import { createNotificationTestMocks, useFakeClock } from "./_helpers.js";

await import("../../config/config.js");
delete process.env.FIREBASE_SERVICE_ACCOUNT_B64;
delete process.env.ENABLE_PUSH_STUB;

const mockCtrl = createNotificationTestMocks();

const { startNotificationScheduler } = await import("../../services/notificationService.js");
const { default: Notification } = await import("../../models/Notification.js");
const { default: NotificationTemplate } = await import("../../models/NotificationTemplate.js");
const { default: CustomerProfile } = await import("../../models/customer/customer.model.js");
const { default: Cart } = await import("../../models/customer/cart.model.js");
const { default: DeviceToken } = await import("../../models/DeviceToken.js");
const { default: Category } = await import("../../models/admin/category.model.js");
const { default: Brand } = await import("../../models/admin/brand.model.js");
const { default: Product } = await import("../../models/admin/product.model.js");
const { default: ProductVariant } = await import("../../models/admin/productVariant.model.js");
const { seedNotificationTemplates } = await import("../../seed/notificationTemplates.js");
const { connectTestDB, closeTestDB, clearTestDB } = await import("../setup.js");

beforeAll(async () => {
  await connectTestDB();
}, 30000);

beforeEach(async () => {
  mockCtrl.reset();
  await clearTestDB();
  await seedNotificationTemplates();
  process.env.NODE_ENV = "test";
  delete process.env.ENABLE_PUSH_STUB;
  delete process.env.DISABLE_SCHEDULER;
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  delete process.env.DISABLE_SCHEDULER;
});

afterAll(async () => {
  await closeTestDB();
});

describe("Notification scheduler", () => {
  it("registers NO cron jobs when DISABLE_SCHEDULER=true", () => {
    process.env.DISABLE_SCHEDULER = "true";
    startNotificationScheduler();
    expect(mockCtrl.mocks.cronScheduleMock).toHaveBeenCalledTimes(0);
    expect(mockCtrl.state.cronJobs).toHaveLength(0);
  });

  it("sends due scheduled notification once and ignores future and cancelled notifications", async () => {
    useFakeClock("2026-11-27T10:00:00.000Z");
    startNotificationScheduler();
    expect(mockCtrl.state.cronJobs).toHaveLength(2);
    const dispatchTick = mockCtrl.state.cronJobs[0].cb;

    const due = await Notification.create({
      title: "Due Now",
      channel: "app",
      status: "scheduled",
      scheduledAt: new Date("2026-11-27T09:59:00.000Z"),
    });
    const future = await Notification.create({
      title: "Future",
      channel: "app",
      status: "scheduled",
      scheduledAt: new Date("2026-11-27T10:05:00.000Z"),
    });
    const cancelled = await Notification.create({
      title: "Cancelled",
      channel: "app",
      status: "cancelled",
      scheduledAt: new Date("2026-11-27T09:50:00.000Z"),
    });

    await dispatchTick();
    expect(mockCtrl.mocks.sendMock).toHaveBeenCalledTimes(1);
    expect(mockCtrl.state.sendCalls[0].notification.title).toBe("Due Now");

    expect((await Notification.findById(due._id)).status).toBe("sent");
    expect((await Notification.findById(future._id)).status).toBe("scheduled");
    expect((await Notification.findById(cancelled._id)).status).toBe("cancelled");
  });

  it("claims a notification only once when two scheduler ticks run concurrently", async () => {
    useFakeClock("2026-11-27T10:00:00.000Z");
    startNotificationScheduler();
    const dispatchTick = mockCtrl.state.cronJobs[0].cb;

    const due = await Notification.create({
      title: "Concurrent Claim",
      channel: "app",
      status: "scheduled",
      scheduledAt: new Date("2026-11-27T09:59:00.000Z"),
    });

    await Promise.all([dispatchTick(), dispatchTick()]);
    expect(mockCtrl.mocks.sendMock).toHaveBeenCalledTimes(1);
    expect((await Notification.findById(due._id)).status).toBe("sent");
  });

  it("recovers expired claims properly and leaves unexpired claims untouched", async () => {
    const nowIso = "2026-11-27T10:10:00.000Z";
    useFakeClock(nowIso);
    const nowMs = Date.now();
    startNotificationScheduler();
    const dispatchTick = mockCtrl.state.cronJobs[0].cb;

    const alreadySent = await Notification.create({
      title: "Already Sent",
      channel: "app",
      status: "sending",
      sentAt: new Date(nowMs - 6 * 60 * 1000),
      claimExpiresAt: new Date(nowMs - 1000),
    });
    const appUnknown = await Notification.create({
      title: "App Unknown",
      channel: "app",
      status: "sending",
      claimExpiresAt: new Date(nowMs - 1000),
    });
    const bothUnknown = await Notification.create({
      title: "Both Unknown",
      channel: "both",
      status: "sending",
      claimExpiresAt: new Date(nowMs - 1000),
    });
    const webExpired = await Notification.create({
      title: "Web Expired",
      channel: "web",
      tickerDurationHours: 6,
      status: "sending",
      claimExpiresAt: new Date(nowMs - 1000),
    });
    const unexpired = await Notification.create({
      title: "Unexpired",
      channel: "app",
      status: "sending",
      claimExpiresAt: new Date(nowMs + 60 * 1000),
    });

    await dispatchTick();

    // Never sends app or both on expired claim recovery; web-only does not call Firebase
    expect(mockCtrl.mocks.sendMock).toHaveBeenCalledTimes(0);

    const s1 = await Notification.findById(alreadySent._id).lean();
    expect(s1.status).toBe("sent");
    expect(s1.claimExpiresAt).toBeUndefined();

    const s2 = await Notification.findById(appUnknown._id).lean();
    expect(s2.status).toBe("failed");
    expect(s2.claimExpiresAt).toBeUndefined();
    expect(s2.result).toEqual({
      ok: false,
      error:
        "Claim expired with unknown provider delivery outcome; delivery aborted to prevent duplicates",
    });

    const s3 = await Notification.findById(bothUnknown._id).lean();
    expect(s3.status).toBe("failed");

    const s4 = await Notification.findById(webExpired._id).lean();
    expect(s4.status).toBe("sent");
    expect(s4.tickerEndsAt.toISOString()).toBe(new Date(nowMs + 6 * 3600 * 1000).toISOString());

    const s5 = await Notification.findById(unexpired._id).lean();
    expect(s5.status).toBe("sending");
  });

  it("respects max 20 due notifications per tick", async () => {
    useFakeClock("2026-11-27T10:00:00.000Z");
    startNotificationScheduler();
    const dispatchTick = mockCtrl.state.cronJobs[0].cb;

    await Notification.insertMany(
      Array.from({ length: 25 }, (_, i) => ({
        title: `Batch ${i}`,
        channel: "app",
        status: "scheduled",
        scheduledAt: new Date("2026-11-27T09:50:00.000Z"),
      }))
    );

    await dispatchTick();
    expect(mockCtrl.mocks.sendMock).toHaveBeenCalledTimes(20);
    expect(await Notification.countDocuments({ status: "sent" })).toBe(20);
    expect(await Notification.countDocuments({ status: "scheduled" })).toBe(5);

    await dispatchTick();
    expect(mockCtrl.mocks.sendMock).toHaveBeenCalledTimes(25);
    expect(await Notification.countDocuments({ status: "sent" })).toBe(25);
  });

  it("runs cart reminder job only during IST hours 10..19 and survives exceptions", async () => {
    await NotificationTemplate.updateOne({ key: "cart_reminder" }, { enabled: true });

    const cat = await Category.create({ name: "C", slug: "c" });
    const brand = await Brand.create({ name: "B", slug: "b" });
    const prod = await Product.create({
      name: "Shirt",
      slug: "shirt",
      category: cat._id,
      brand: brand._id,
      status: "active",
    });
    const variant = await ProductVariant.create({
      product: prod._id,
      sku: "S-1",
      price: 500,
      stock: 5,
    });
    const cust = await CustomerProfile.create({ authUserId: "cr-1", isActive: true });
    await DeviceToken.create({ customer: cust._id, token: "tok-cr-1" });
    const cart = await Cart.create({
      customer: cust._id,
      items: [{ variant: variant._id, quantity: 1 }],
    });

    startNotificationScheduler();
    const cartJob = mockCtrl.state.cronJobs[1].cb;

    // 09:59 IST = 04:29 UTC -> outside (hour 9)
    useFakeClock("2026-11-27T04:29:00.000Z");
    await Cart.collection.updateOne(
      { _id: cart._id },
      { $set: { updatedAt: new Date(Date.now() - 30 * 3600 * 1000) } }
    );
    await cartJob();
    expect(mockCtrl.mocks.sendEachMock).toHaveBeenCalledTimes(0);

    // 20:00 IST = 14:30 UTC -> outside (hour 20)
    useFakeClock("2026-11-27T14:30:00.000Z");
    await Cart.collection.updateOne(
      { _id: cart._id },
      { $set: { updatedAt: new Date(Date.now() - 30 * 3600 * 1000) } }
    );
    await cartJob();
    expect(mockCtrl.mocks.sendEachMock).toHaveBeenCalledTimes(0);

    // Day boundary 00:00 IST = 18:30 UTC previous day -> outside (hour 0)
    useFakeClock("2026-11-26T18:30:00.000Z");
    await Cart.collection.updateOne(
      { _id: cart._id },
      { $set: { updatedAt: new Date(Date.now() - 30 * 3600 * 1000) } }
    );
    await cartJob();
    expect(mockCtrl.mocks.sendEachMock).toHaveBeenCalledTimes(0);

    // 10:00 IST = 04:30 UTC -> inside (hour 10), force an error on first run to prove job survives
    useFakeClock("2026-11-27T04:30:00.000Z");
    await Cart.collection.updateOne(
      { _id: cart._id },
      { $set: { updatedAt: new Date(Date.now() - 30 * 3600 * 1000) } }
    );
    mockCtrl.setSendEachHandler(async () => {
      throw new Error("Transient FCM crash");
    });
    await expect(cartJob()).resolves.toBeUndefined();
    expect(mockCtrl.mocks.sendEachMock).toHaveBeenCalledTimes(1);

    // Next tick at 19:59 IST = 14:29 UTC -> inside (hour 19), recovers and sends!
    mockCtrl.setSendEachHandler(null);
    useFakeClock("2026-11-27T14:29:00.000Z");
    await Cart.collection.updateOne(
      { _id: cart._id },
      { $set: { updatedAt: new Date(Date.now() - 30 * 3600 * 1000) } }
    );
    await cartJob();
    expect(mockCtrl.mocks.sendEachMock).toHaveBeenCalledTimes(2);

    // Dispatch tick survives DB error cleanly
    const dispatchTick = mockCtrl.state.cronJobs[0].cb;
    jest.spyOn(Notification, "find").mockImplementationOnce(() => {
      throw new Error("Scheduler DB glitch");
    });
    await expect(dispatchTick()).resolves.toBeUndefined();
  });
});
