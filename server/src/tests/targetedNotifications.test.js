import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";

// Load config (which loads .env) first, then clear Firebase creds so push stub runs cleanly
await import("../config/config.js");
delete process.env.FIREBASE_SERVICE_ACCOUNT_B64;
process.env.ALLOW_PUSH_STUB = "true";

const { default: app } = await import("../app.js");
const { default: User } = await import("../models/admin/user.model.js");
const { default: Category } = await import("../models/admin/category.model.js");
const { default: Brand } = await import("../models/admin/brand.model.js");
const { default: Product } = await import("../models/admin/product.model.js");
const { default: ProductVariant } = await import("../models/admin/productVariant.model.js");
const { default: CustomerProfile } = await import("../models/customer/customer.model.js");
const { default: Cart } = await import("../models/customer/cart.model.js");
const { default: Wishlist } = await import("../models/customer/wishlist.model.js");
const { default: Order } = await import("../models/customer/order.model.js");
const { default: DeviceToken } = await import("../models/DeviceToken.js");
const { default: Notification } = await import("../models/Notification.js");
const { default: NotificationTemplate } = await import("../models/NotificationTemplate.js");
const { default: NotificationLog } = await import("../models/NotificationLog.js");
const { seedNotificationTemplates } = await import("../seed/notificationTemplates.js");
const {
  applyCooldown,
  dispatch,
  filterAllowed,
  runCartReminders,
  sendPersonalBatch,
  sendTemplateToCustomer,
  sendToCustomer,
  sendToTopic,
  startNotificationScheduler,
} = await import("../services/notificationService.js");
const { resolveAudience } = await import("../services/notificationAudience.js");
const { notifyRestock, notifyPriceDropsBulk } = await import("../services/notificationTriggers.js");
const { connectTestDB, closeTestDB, clearTestDB } = await import("./setup.js");
const { createCustomerAuth } = await import("../config/customerAuth.js");

let adminToken;
let categoryId;
let subCategoryId;
let product;
let variant;
let cust1Profile;
let cust2Profile;
let custBlockedProfile;

beforeAll(async () => {
  process.env.ALLOW_PUSH_STUB = "true";
  await connectTestDB();
  await createCustomerAuth();
}, 30000);

afterEach(async () => {
  jest.restoreAllMocks();
  await clearTestDB();
});

afterAll(async () => {
  delete process.env.ALLOW_PUSH_STUB;
  await closeTestDB();
});

beforeEach(async () => {
  await seedNotificationTemplates();

  await User.create({
    name: "Admin",
    email: "admin@test.com",
    password: "Test1234!",
    role: "admin",
  });
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@test.com", password: "Test1234!" });
  adminToken = loginRes.body.data.accessToken;

  const cat = await Category.create({ name: "Apparel", slug: "apparel" });
  const subCat = await Category.create({
    name: "Jackets",
    slug: "jackets",
    parent: cat._id,
  });
  categoryId = cat._id.toString();
  subCategoryId = subCat._id.toString();

  const brand = await Brand.create({ name: "Fibio", slug: "fibio" });
  product = await Product.create({
    name: "Denim Jacket",
    slug: "denim-jacket",
    description: "Classic jacket",
    category: subCat._id,
    brand: brand._id,
    status: "active",
    images: [{ url: "https://ik.imagekit.io/test/jacket.jpg", source: "imagekit" }],
  });

  variant = await ProductVariant.create({
    product: product._id,
    sku: "DJ-001",
    price: 2000,
    stock: 10,
    isActive: true,
  });

  const db = mongoose.connection.db;
  await db.collection("customerUser").insertMany([
    {
      id: "auth-c1",
      name: "Aisha",
      email: "aisha@test.com",
      createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000),
    },
    {
      id: "auth-c2",
      name: "Rohan",
      email: "rohan@test.com",
      createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    },
    {
      id: "auth-blocked",
      name: "Blocked",
      email: "blocked@test.com",
      createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000),
    },
  ]);

  cust1Profile = await CustomerProfile.create({
    authUserId: "auth-c1",
    isActive: true,
    createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000),
  });
  cust2Profile = await CustomerProfile.create({
    authUserId: "auth-c2",
    isActive: true,
    createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
  });
  custBlockedProfile = await CustomerProfile.create({
    authUserId: "auth-blocked",
    isActive: false,
    createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000),
  });
});

describe("Targeted push notifications", () => {
  it("resolves all audience segments, excludes blocked customers, and counts device tokens", async () => {
    await Cart.create({
      customer: cust1Profile._id,
      items: [{ variant: variant._id, quantity: 2 }],
    });
    await Cart.create({
      customer: custBlockedProfile._id,
      items: [{ variant: variant._id, quantity: 1 }],
    });
    await Wishlist.create({
      customer: cust2Profile._id,
      products: [product._id],
    });
    await DeviceToken.create({ customer: cust1Profile._id, token: "tok-1" });

    await Order.create({
      orderNumber: "ORD-1",
      customer: cust2Profile._id,
      items: [{ product: product._id, variantId: variant._id, name: "Denim Jacket", quantity: 1, unitPrice: 2000 }],
      shippingAddress: { line1: "123 St", city: "Mumbai", postalCode: "400001" },
      subtotal: 2000,
      total: 2000,
      orderStatus: "delivered",
      payment: { status: "paid" },
    });

    const cartAud = await resolveAudience("cart");
    expect(cartAud).toHaveLength(1);
    expect(String(cartAud[0].customerId)).toBe(String(cust1Profile._id));
    expect(cartAud[0].name).toBe("Aisha");
    expect(cartAud[0].product.name).toBe("Denim Jacket");

    const catAud = await resolveAudience("category", { categoryId });
    expect(catAud).toHaveLength(2);

    const inactiveAud = await resolveAudience("inactive_30d");
    expect(inactiveAud).toHaveLength(1);
    expect(String(inactiveAud[0].customerId)).toBe(String(cust1Profile._id));

    const neverOrderedAud = await resolveAudience("never_ordered");
    expect(neverOrderedAud).toHaveLength(1);
    expect(String(neverOrderedAud[0].customerId)).toBe(String(cust1Profile._id));

    const boughtAud = await resolveAudience("bought_before");
    expect(boughtAud).toHaveLength(1);
    expect(String(boughtAud[0].customerId)).toBe(String(cust2Profile._id));

    const countRes = await request(app)
      .post("/api/admin/notifications/audience-count")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ segment: "category", categoryId: subCategoryId });
    expect(countRes.status).toBe(200);
    expect(countRes.body).toEqual({ total: 2, withApp: 1 });
  });

  it("sends a segmented cart campaign with stub, logs [push stub:batch], and stores stats", async () => {
    await Cart.create({
      customer: cust1Profile._id,
      items: [{ variant: variant._id, quantity: 1 }],
    });
    await DeviceToken.create({ customer: cust1Profile._id, token: "tok-c1" });

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const res = await request(app)
      .post("/api/admin/notifications")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Hey {{name}}, check {{product}}",
        body: "You left {{count}} item(s) behind",
        channel: "both", // should be forced to "app"
        audience: { type: "segment", segment: "cart" },
        personalImage: true,
        sendNow: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.notification.channel).toBe("app");
    expect(res.body.notification.status).toBe("sent");
    expect(res.body.notification.stats).toEqual({
      targeted: 1,
      withDevice: 1,
      delivered: 1,
      failed: 0,
    });
    expect(logSpy).toHaveBeenCalledWith("[push stub:batch]", "campaign", 1, "customers");
  });

  it("returns 400 when no customers in the audience have the app installed", async () => {
    await Cart.create({
      customer: cust1Profile._id,
      items: [{ variant: variant._id, quantity: 1 }],
    });

    const res = await request(app)
      .post("/api/admin/notifications")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Hey {{name}}",
        body: "Come back",
        audience: { type: "segment", segment: "cart" },
        sendNow: true,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("No customers in this audience have the app installed");
  });

  it("enforces 72h key cooldown and 24h marketing cap", async () => {
    await NotificationLog.create({
      customer: cust1Profile._id,
      key: "price_drop",
      marketing: true,
      sentAt: new Date(Date.now() - 2 * 3600 * 1000), // 2h ago
    });

    const filtered = await applyCooldown(
      [
        { customerId: cust1Profile._id, title: "t", body: "b" },
        { customerId: cust2Profile._id, title: "t", body: "b" },
      ],
      { key: "cart_reminder", cooldownHours: 72 }
    );
    expect(filtered).toHaveLength(1);
    expect(String(filtered[0].customerId)).toBe(String(cust2Profile._id));
  });

  it("runs cart reminders only for 24-72h idle carts and respects template enabled toggle", async () => {
    await NotificationTemplate.updateOne({ key: "cart_reminder" }, { enabled: true });
    const db = mongoose.connection.db;
    const idleCart = await Cart.create({
      customer: cust1Profile._id,
      items: [{ variant: variant._id, quantity: 1 }],
    });
    const freshCart = await Cart.create({
      customer: cust2Profile._id,
      items: [{ variant: variant._id, quantity: 1 }],
    });

    await db.collection("carts").updateOne(
      { _id: idleCart._id },
      { $set: { updatedAt: new Date(Date.now() - 30 * 3600 * 1000) } }
    );
    await db.collection("carts").updateOne(
      { _id: freshCart._id },
      { $set: { updatedAt: new Date(Date.now() - 2 * 3600 * 1000) } }
    );

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await runCartReminders();
    expect(logSpy).toHaveBeenCalledWith("[push stub:batch]", "cart_reminder", 1, "customers");

    // Disable template via PATCH and verify no send happens
    const tpl = await NotificationTemplate.findOne({ key: "cart_reminder" });
    const patchRes = await request(app)
      .patch(`/api/admin/notification-templates/${tpl._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ enabled: false });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.template.enabled).toBe(false);

    logSpy.mockClear();
    await runCartReminders();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("triggers price drop on >=5% drop on variant edit and respects template enabled flag", async () => {
    await NotificationTemplate.updateOne({ key: "price_drop" }, { enabled: true });
    await Wishlist.create({
      customer: cust1Profile._id,
      products: [product._id],
    });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // 3% drop -> should NOT notify
    const smallRes = await request(app)
      .put(`/api/products/${product._id}/variants/${variant._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ price: 1940 });
    expect(smallRes.status).toBe(200);
    await new Promise((r) => setTimeout(r, 50));
    expect(logSpy).not.toHaveBeenCalledWith("[push stub:batch]", "price_drop", 1, "customers");

    // >=5% drop via salePrice (1940 -> 1500) -> SHOULD notify
    const dropRes = await request(app)
      .put(`/api/products/${product._id}/variants/${variant._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ price: 1940, salePrice: 1500 });
    expect(dropRes.status).toBe(200);
    await new Promise((r) => setTimeout(r, 100));
    expect(logSpy).toHaveBeenCalledWith("[push stub:batch]", "price_drop", 1, "customers");

    // Disable restock & order_shipped templates -> should skip
    await DeviceToken.create({ customer: cust1Profile._id, token: "tok-restock" });
    await NotificationTemplate.updateOne({ key: "restock" }, { enabled: false });
    await NotificationTemplate.updateOne({ key: "order_shipped" }, { enabled: false });
    logSpy.mockClear();
    await notifyRestock(product);
    await sendTemplateToCustomer("order_shipped", cust1Profile._id, { orderNumber: "ORD-1" });
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("dispatches scheduled segment notification", async () => {
    await Cart.create({
      customer: cust1Profile._id,
      items: [{ variant: variant._id, quantity: 1 }],
    });
    await DeviceToken.create({ customer: cust1Profile._id, token: "tok-sched" });

    const future = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const res = await request(app)
      .post("/api/admin/notifications")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Hi {{name}}",
        body: "Item {{product}} in cart",
        audience: { type: "segment", segment: "cart" },
        sendNow: false,
        scheduledAt: future,
      });

    expect(res.status).toBe(201);
    expect(res.body.notification.status).toBe("scheduled");

    const doc = await Notification.findById(res.body.notification._id);
    await dispatch(doc);
    const updated = await Notification.findById(doc._id).lean();
    expect(updated.status).toBe("sent");
    expect(updated.stats.delivered).toBe(1);
  });

  it("seeds cart_reminder and price_drop with enabled: false without overwriting existing templates", async () => {
    const cr = await NotificationTemplate.findOne({ key: "cart_reminder" }).lean();
    const pd = await NotificationTemplate.findOne({ key: "price_drop" }).lean();
    expect(cr.enabled).toBe(false);
    expect(pd.enabled).toBe(false);

    await NotificationTemplate.updateOne({ key: "price_drop" }, { enabled: true });
    await seedNotificationTemplates();
    const pdAfter = await NotificationTemplate.findOne({ key: "price_drop" }).lean();
    expect(pdAfter.enabled).toBe(true);
  });

  it("notifyPriceDropsBulk groups multiple drops per customer into 1 summary push, caps at 100, and skips when disabled", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const prod2 = await Product.create({
      name: "Canvas Sneakers",
      slug: "canvas-sneakers",
      category: subCategoryId,
      brand: product.brand,
      status: "active",
      images: [{ url: "https://ik.imagekit.io/test/sneakers.jpg", source: "imagekit" }],
    });
    const var2 = await ProductVariant.create({
      product: prod2._id,
      sku: "CS-001",
      price: 1000,
      stock: 5,
    });

    await Wishlist.create({
      customer: cust1Profile._id,
      products: [product._id],
    });
    await Cart.create({
      customer: cust1Profile._id,
      items: [{ variant: var2._id, quantity: 1 }],
    });
    await Cart.create({
      customer: cust2Profile._id,
      items: [{ variant: var2._id, quantity: 1 }],
    });

    const drops = [
      {
        productId: product._id,
        name: product.name,
        slug: product.slug,
        image: product.images[0].url,
        oldPrice: 2000,
        newPrice: 1800, // 10% drop
      },
      {
        productId: prod2._id,
        name: prod2.name,
        slug: prod2.slug,
        image: prod2.images[0].url,
        oldPrice: 1000,
        newPrice: 600, // 40% drop (biggest)
      },
    ];

    // Disabled by default -> skips
    await notifyPriceDropsBulk(drops);
    expect(logSpy).not.toHaveBeenCalledWith("[push stub:batch]", "price_drop", 2, "customers");

    // Enabled -> sends 1 summary push to cust1 (2 drops) + 1 single drop push to cust2 (1 drop)
    await NotificationTemplate.updateOne({ key: "price_drop" }, { enabled: true });
    await notifyPriceDropsBulk(drops);
    expect(logSpy).toHaveBeenCalledWith("[push stub:batch]", "price_drop", 2, "customers");
  });

  it("enforces PUSH_ALLOWLIST_CUSTOMER_IDS on personal pushes without affecting sendToTopic", async () => {
    await DeviceToken.create({ customer: cust1Profile._id, token: "tok-a1" });
    await DeviceToken.create({ customer: cust2Profile._id, token: "tok-a2" });
    await NotificationTemplate.updateOne({ key: "order_shipped" }, { enabled: true });

    process.env.PUSH_ALLOWLIST_CUSTOMER_IDS = String(cust1Profile._id);
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    try {
      expect(filterAllowed([cust1Profile._id, cust2Profile._id])).toEqual([cust1Profile._id]);

      await sendTemplateToCustomer("order_shipped", cust2Profile._id, { orderNumber: "ORD-2" });
      expect(logSpy).toHaveBeenCalledWith("[allowlist] skipped", String(cust2Profile._id));

      await sendToCustomer(cust1Profile._id, { title: "Hi", body: "Allowed" });
      expect(logSpy).toHaveBeenCalledWith("[push stub:customer]", String(cust1Profile._id), "Hi", "|", "Allowed");

      const batchStats = await sendPersonalBatch(
        [
          { customerId: cust1Profile._id, title: "T1", body: "B1" },
          { customerId: cust2Profile._id, title: "T2", body: "B2" },
        ],
        { key: "campaign" }
      );
      expect(batchStats).toEqual({ targeted: 1, withDevice: 1, delivered: 1, failed: 0 });
      expect(logSpy).toHaveBeenCalledWith("[allowlist] skipped", 1, "customers in batch", "campaign");

      const topicRes = await sendToTopic({ title: "Sale", body: "Live" });
      expect(topicRes).toEqual({ ok: true, stub: true });
      expect(logSpy).toHaveBeenCalledWith("[push stub:topic]", "Sale", "|", "Live");
    } finally {
      delete process.env.PUSH_ALLOWLIST_CUSTOMER_IDS;
    }
  });

  it("skips registering cron jobs when DISABLE_SCHEDULER is true", () => {
    process.env.DISABLE_SCHEDULER = "true";
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    try {
      startNotificationScheduler();
      expect(logSpy).toHaveBeenCalledWith("[scheduler] disabled");
    } finally {
      delete process.env.DISABLE_SCHEDULER;
    }
  });
});
