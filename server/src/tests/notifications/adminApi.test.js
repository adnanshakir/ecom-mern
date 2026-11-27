import { jest } from "@jest/globals";
import request from "supertest";
import {
  createNotificationTestMocks,
  createAdminUser,
  signExpiredAdminToken,
  signCustomerTypedJwt,
  useFakeClock,
} from "./_helpers.js";

await import("../../config/config.js");
delete process.env.FIREBASE_SERVICE_ACCOUNT_B64;
delete process.env.ENABLE_PUSH_STUB;

const mockCtrl = createNotificationTestMocks();

const { config } = await import("../../config/config.js");
const { default: app } = await import("../../app.js");
const { seedNotificationTemplates } = await import("../../seed/notificationTemplates.js");
const { default: User } = await import("../../models/admin/user.model.js");
const { default: Notification } = await import("../../models/Notification.js");
const { default: NotificationTemplate } = await import("../../models/NotificationTemplate.js");
const { default: Category } = await import("../../models/admin/category.model.js");
const { default: Brand } = await import("../../models/admin/brand.model.js");
const { default: Product } = await import("../../models/admin/product.model.js");
const { default: ProductVariant } = await import("../../models/admin/productVariant.model.js");
const { default: CustomerProfile } = await import("../../models/customer/customer.model.js");
const { default: Cart } = await import("../../models/customer/cart.model.js");
const { default: DeviceToken } = await import("../../models/DeviceToken.js");
const { connectTestDB, closeTestDB, clearTestDB } = await import("../setup.js");

let adminUser;
let adminToken;
let staffToken;

beforeAll(async () => {
  await connectTestDB();
}, 30000);

beforeEach(async () => {
  mockCtrl.reset();
  await clearTestDB();
  await seedNotificationTemplates();
  process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/test";

  const admin = await createAdminUser(User, app, { role: "admin", email: "admin@test.com" });
  adminUser = admin.user;
  adminToken = admin.token;

  const staff = await createAdminUser(User, app, {
    role: "staff",
    email: "staff@test.com",
    name: "Staff",
  });
  staffToken = staff.token;
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

afterAll(async () => {
  await closeTestDB();
});

describe("Admin Notification & Template API", () => {
  describe("Authentication and RBAC", () => {
    it("rejects missing, expired, customer-typed, and staff tokens on every notification and template route", async () => {
      const expiredToken = signExpiredAdminToken(adminUser, config.jwtSecret.secret);
      const custToken = signCustomerTypedJwt("cust-1", config.jwtSecret.secret);
      const tpl = await NotificationTemplate.findOne({ key: "sale" });
      const notif = await Notification.create({ title: "X", channel: "web", status: "scheduled" });

      const routes = [
        ["get", "/api/admin/notifications"],
        ["post", "/api/admin/notifications"],
        ["post", "/api/admin/notifications/audience-count"],
        ["post", "/api/admin/notifications/resolve-image"],
        ["patch", `/api/admin/notifications/${notif._id}/cancel`],
        ["patch", `/api/admin/notifications/${notif._id}/end-ticker`],
        ["get", "/api/admin/notification-templates"],
        ["post", "/api/admin/notification-templates"],
        ["patch", `/api/admin/notification-templates/${tpl._id}`],
        ["delete", `/api/admin/notification-templates/${tpl._id}`],
      ];

      for (const [method, url] of routes) {
        const noAuth = await request(app)[method](url);
        expect(noAuth.status).toBe(401);

        const expRes = await request(app)
          [method](url)
          .set("Authorization", `Bearer ${expiredToken}`);
        expect(expRes.status).toBe(401);

        const custRes = await request(app)[method](url).set("Authorization", `Bearer ${custToken}`);
        expect(custRes.status).toBe(401);

        const staffRes = await request(app)
          [method](url)
          .set("Authorization", `Bearer ${staffToken}`);
        expect(staffRes.status).toBe(403);
      }
      expect(mockCtrl.mocks.sendMock).toHaveBeenCalledTimes(0);
    });
  });

  describe("createNotification validation rules", () => {
    it("rejects empty or whitespace title with 400", async () => {
      const r1 = await request(app)
        .post("/api/admin/notifications")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "" });
      expect(r1.status).toBe(400);

      const r2 = await request(app)
        .post("/api/admin/notifications")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "   \t\n  " });
      expect(r2.status).toBe(400);
      expect(await Notification.countDocuments()).toBe(0);
    });

    it("accepts 65-char title and rejects 66-char title with 400", async () => {
      const r65 = await request(app)
        .post("/api/admin/notifications")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "A".repeat(65), channel: "web", sendNow: true });
      expect(r65.status).toBe(201);

      const r66 = await request(app)
        .post("/api/admin/notifications")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "A".repeat(66), channel: "web", sendNow: true });
      expect(r66.status).toBe(400);
    });

    it("accepts 240-char body and rejects 241-char body with 400", async () => {
      const r240 = await request(app)
        .post("/api/admin/notifications")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "Ok", body: "B".repeat(240), channel: "web", sendNow: true });
      expect(r240.status).toBe(201);

      const r241 = await request(app)
        .post("/api/admin/notifications")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "Ok", body: "B".repeat(241), channel: "web", sendNow: true });
      expect(r241.status).toBe(400);
    });

    it("rejects leftover {{placeholder}} in broadcast title/body and unallowed placeholders in segments", async () => {
      const cat = await Category.create({ name: "C", slug: "c" });
      const brand = await Brand.create({ name: "B", slug: "b" });
      const prod = await Product.create({
        name: "P",
        slug: "p",
        category: cat._id,
        brand: brand._id,
        status: "active",
      });
      const variant = await ProductVariant.create({
        product: prod._id,
        sku: "P1",
        price: 100,
        stock: 5,
      });
      const cust = await CustomerProfile.create({ authUserId: "ph-c", isActive: true });
      await Cart.create({ customer: cust._id, items: [{ variant: variant._id, quantity: 1 }] });
      await DeviceToken.create({ customer: cust._id, token: "tok-ph" });

      for (const payload of [
        { title: "Hi {{name}}", body: "ok" },
        { title: "Ok", body: "Save {{discount}}%" },
        { title: "Sale {{unclosed", body: "" },
      ]) {
        const res = await request(app)
          .post("/api/admin/notifications")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ ...payload, audience: { type: "all" }, sendNow: true });
        expect(res.status).toBe(400);
      }

      for (const payload of [
        { title: "Hi {{name}} {{discount}}" },
        { title: "Hi {{name}}", body: "{{foo bar}}" },
        { title: "Hi {{unclosed" },
      ]) {
        const res = await request(app)
          .post("/api/admin/notifications")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ ...payload, audience: { type: "segment", segment: "cart" }, sendNow: true });
        expect(res.status).toBe(400);
      }

      const okRes = await request(app)
        .post("/api/admin/notifications")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Hi {{name}}",
          body: "{{product}} ({{count}})",
          audience: { type: "segment", segment: "cart" },
          sendNow: true,
        });
      expect(okRes.status).toBe(201);
    });

    it("rejects non-https imageUrl with 400", async () => {
      const res = await request(app)
        .post("/api/admin/notifications")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Sale",
          imageUrl: "http://cdn.example.com/a.jpg",
          channel: "app",
          sendNow: true,
        });
      expect(res.status).toBe(400);
      expect(mockCtrl.mocks.sendMock).toHaveBeenCalledTimes(0);
    });

    it("rejects schedule less than 60s ahead and invalid dates, accepts >= 60s ahead", async () => {
      useFakeClock("2026-11-27T10:00:00.000Z");

      const tooSoon = await request(app)
        .post("/api/admin/notifications")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Soon",
          channel: "app",
          sendNow: false,
          scheduledAt: new Date(Date.now() + 59 * 1000).toISOString(),
        });
      expect(tooSoon.status).toBe(400);

      const invalidDate = await request(app)
        .post("/api/admin/notifications")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Bad Date",
          channel: "app",
          sendNow: false,
          scheduledAt: "not-a-date",
        });
      expect(invalidDate.status).toBe(400);

      const okSched = await request(app)
        .post("/api/admin/notifications")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Exact 60s",
          channel: "app",
          sendNow: false,
          scheduledAt: new Date(Date.now() + 60 * 1000).toISOString(),
        });
      expect(okSched.status).toBe(201);
      expect(okSched.body.notification.status).toBe("scheduled");
    });

    it("rejects unknown channel and unknown type with 400", async () => {
      const badChan = await request(app)
        .post("/api/admin/notifications")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "T", channel: "sms", sendNow: true });
      expect(badChan.status).toBe(400);

      const badType = await request(app)
        .post("/api/admin/notifications")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "T", type: "bogus_type", channel: "web", sendNow: true });
      expect(badType.status).toBe(400);
    });

    it("forces segment campaign with channel='web' to 'app' and returns 400 when 0 reachable customers", async () => {
      const cat = await Category.create({ name: "C", slug: "c" });
      const brand = await Brand.create({ name: "B", slug: "b" });
      const prod = await Product.create({
        name: "P",
        slug: "p",
        category: cat._id,
        brand: brand._id,
        status: "active",
      });
      const variant = await ProductVariant.create({
        product: prod._id,
        sku: "P1",
        price: 100,
        stock: 5,
      });
      const cust = await CustomerProfile.create({ authUserId: "seg-c", isActive: true });
      await Cart.create({ customer: cust._id, items: [{ variant: variant._id, quantity: 1 }] });

      // 0 reachable customers -> 400
      const zeroRes = await request(app)
        .post("/api/admin/notifications")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Come back",
          channel: "web",
          audience: { type: "segment", segment: "cart" },
          sendNow: true,
        });
      expect(zeroRes.status).toBe(400);
      expect(zeroRes.body.message).toBe("No customers in this audience have the app installed");

      await DeviceToken.create({ customer: cust._id, token: "tok-seg" });
      const okRes = await request(app)
        .post("/api/admin/notifications")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Come back",
          channel: "web",
          audience: { type: "segment", segment: "cart" },
          sendNow: true,
        });
      expect(okRes.status).toBe(201);
      expect(okRes.body.notification.channel).toBe("app");
      expect(okRes.body.notification.status).toBe("sent");
    });
  });

  describe("cancel, end-ticker, and list", () => {
    it("cancels only scheduled notifications, refuses sent, and end-ticker sets tickerEndsAt to now", async () => {
      useFakeClock("2026-11-27T10:00:00.000Z");

      const sched = await Notification.create({
        title: "Sched",
        channel: "app",
        status: "scheduled",
      });
      const sent = await Notification.create({
        title: "Sent",
        channel: "both",
        status: "sent",
        sentAt: new Date(),
        tickerEndsAt: new Date(Date.now() + 3600 * 1000),
      });

      const cancelSched = await request(app)
        .patch(`/api/admin/notifications/${sched._id}/cancel`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(cancelSched.status).toBe(200);
      expect(cancelSched.body.notification.status).toBe("cancelled");

      const cancelSent = await request(app)
        .patch(`/api/admin/notifications/${sent._id}/cancel`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(cancelSent.status).toBe(400);
      expect((await Notification.findById(sent._id)).status).toBe("sent");

      const endRes = await request(app)
        .patch(`/api/admin/notifications/${sent._id}/end-ticker`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(endRes.status).toBe(200);
      expect(new Date(endRes.body.notification.tickerEndsAt).toISOString()).toBe(
        "2026-11-27T10:00:00.000Z"
      );
    });

    it("supports pagination boundaries, status filter, and computes isTickerLive accurately", async () => {
      useFakeClock("2026-11-27T12:00:00.000Z");
      const now = Date.now();

      await Notification.create({
        title: "Live Both",
        channel: "both",
        status: "sent",
        sentAt: new Date(now - 1000),
        tickerEndsAt: new Date(now + 10000),
      });
      await Notification.create({
        title: "Expired Web",
        channel: "web",
        status: "sent",
        sentAt: new Date(now - 2000),
        tickerEndsAt: new Date(now - 1000),
      });
      await Notification.create({
        title: "App Only",
        channel: "app",
        status: "sent",
        sentAt: new Date(now - 3000),
        tickerEndsAt: new Date(now + 10000),
      });
      await Notification.create({
        title: "Failed",
        channel: "web",
        status: "failed",
      });

      const page1 = await request(app)
        .get("/api/admin/notifications?page=1&limit=2&status=sent")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(page1.status).toBe(200);
      expect(page1.body.total).toBe(3);
      expect(page1.body.pages).toBe(2);
      expect(page1.body.notifications).toHaveLength(2);

      const byTitle = new Map(page1.body.notifications.map((n) => [n.title, n]));
      // Order depends on createdAt desc; check all 3 across page1 + page2
      const page2 = await request(app)
        .get("/api/admin/notifications?page=2&limit=2&status=sent")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(page2.status).toBe(200);
      expect(page2.body.notifications).toHaveLength(1);

      const allSent = [...page1.body.notifications, ...page2.body.notifications];
      for (const n of allSent) byTitle.set(n.title, n);
      expect(byTitle.get("Live Both").isTickerLive).toBe(true);
      expect(byTitle.get("Expired Web").isTickerLive).toBe(false);
      expect(byTitle.get("App Only").isTickerLive).toBe(false);
    });
  });

  describe("Templates, audience-count, and resolve-image", () => {
    it("seeds cart_reminder and price_drop disabled without overwriting existing templates", async () => {
      const cr = await NotificationTemplate.findOne({ key: "cart_reminder" }).lean();
      const pd = await NotificationTemplate.findOne({ key: "price_drop" }).lean();
      expect(cr.enabled).toBe(false);
      expect(pd.enabled).toBe(false);

      await NotificationTemplate.updateOne({ key: "price_drop" }, { enabled: true });
      await seedNotificationTemplates();
      expect((await NotificationTemplate.findOne({ key: "price_drop" }).lean()).enabled).toBe(true);
    });

    it("creates custom templates with unique key, protects key/auto/isSystem on PATCH, enforces auto channel='app', toggles enabled, and deletes custom only", async () => {
      const createRes = await request(app)
        .post("/api/admin/notification-templates")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Weekend Promo", type: "sale", titleTpl: "Hi {{event}}", channel: "both" });
      expect(createRes.status).toBe(201);
      const custom = createRes.body.template;
      expect(custom.key).toMatch(/^weekend_promo_/);
      expect(custom.auto).toBe(false);
      expect(custom.isSystem).toBe(false);

      // PATCH ignores key, auto, isSystem
      const patchCustom = await request(app)
        .patch(`/api/admin/notification-templates/${custom._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          key: "hijacked",
          auto: true,
          isSystem: true,
          enabled: false,
          name: "Weekend Updated",
        });
      expect(patchCustom.status).toBe(200);
      expect(patchCustom.body.template.key).toBe(custom.key);
      expect(patchCustom.body.template.auto).toBe(false);
      expect(patchCustom.body.template.isSystem).toBe(false);
      expect(patchCustom.body.template.enabled).toBe(false);
      expect(patchCustom.body.template.name).toBe("Weekend Updated");

      // Auto template rejects non-app channel
      const autoTpl = await NotificationTemplate.findOne({ key: "cart_reminder" });
      const badAuto = await request(app)
        .patch(`/api/admin/notification-templates/${autoTpl._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ channel: "web" });
      expect(badAuto.status).toBe(400);

      // System template cannot be deleted
      const delSys = await request(app)
        .delete(`/api/admin/notification-templates/${autoTpl._id}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(delSys.status).toBe(400);

      // Custom template delete works
      const delCustom = await request(app)
        .delete(`/api/admin/notification-templates/${custom._id}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(delCustom.status).toBe(200);
      expect(await NotificationTemplate.findById(custom._id)).toBeNull();
    });

    it("handles valid and invalid inputs on audience-count and resolve-image", async () => {
      const cat = await Category.create({ name: "Apparel", slug: "apparel" });
      const brand = await Brand.create({ name: "Fibio", slug: "fibio" });
      const prod = await Product.create({
        name: "Jacket",
        slug: "jacket",
        category: cat._id,
        brand: brand._id,
        status: "active",
        images: [{ url: "https://ik.imagekit.io/test/j.jpg" }],
      });
      await ProductVariant.create({ product: prod._id, sku: "J-1", price: 1000, stock: 5 });

      const badSeg = await request(app)
        .post("/api/admin/notifications/audience-count")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ segment: "bogus" });
      expect(badSeg.status).toBe(400);

      const catMissingId = await request(app)
        .post("/api/admin/notifications/audience-count")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ segment: "category" });
      expect(catMissingId.status).toBe(200);
      expect(catMissingId.body).toEqual({ total: 0, withApp: 0 });

      const validResolve = await request(app)
        .post("/api/admin/notifications/resolve-image")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ link: "/product/jacket" });
      expect(validResolve.status).toBe(200);
      expect(validResolve.body).toEqual({ imageUrl: "https://ik.imagekit.io/test/j.jpg" });

      const invalidResolve = await request(app)
        .post("/api/admin/notifications/resolve-image")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ link: { $ne: null } });
      expect(invalidResolve.status).toBe(400);
    });

    it("validates remaining edge cases across create, cancel, end-ticker, and template CRUD", async () => {
      // Invalid segment, missing categoryId, non-string body/imageUrl
      expect(
        (
          await request(app)
            .post("/api/admin/notifications")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Ok", audience: { type: "segment", segment: "nope" } })
        ).status
      ).toBe(400);
      expect(
        (
          await request(app)
            .post("/api/admin/notifications")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Ok", audience: { type: "segment", segment: "category" } })
        ).status
      ).toBe(400);
      expect(
        (
          await request(app)
            .post("/api/admin/notifications")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Ok", body: 123 })
        ).status
      ).toBe(400);
      expect(
        (
          await request(app)
            .post("/api/admin/notifications")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Ok", imageUrl: 123 })
        ).status
      ).toBe(400);

      // Invalid ObjectId and 404s on cancel, end-ticker, updateTemplate, deleteTemplate
      expect(
        (
          await request(app)
            .patch("/api/admin/notifications/bad-id/cancel")
            .set("Authorization", `Bearer ${adminToken}`)
        ).status
      ).toBe(400);
      expect(
        (
          await request(app)
            .patch("/api/admin/notifications/bad-id/end-ticker")
            .set("Authorization", `Bearer ${adminToken}`)
        ).status
      ).toBe(400);
      expect(
        (
          await request(app)
            .patch("/api/admin/notifications/507f1f77bcf86cd799439011/end-ticker")
            .set("Authorization", `Bearer ${adminToken}`)
        ).status
      ).toBe(404);

      // Template list filters (?auto=true / ?auto=false)
      const autoList = await request(app)
        .get("/api/admin/notification-templates?auto=true")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(autoList.status).toBe(200);
      expect(autoList.body.templates.every((t) => t.auto === true)).toBe(true);

      const manualList = await request(app)
        .get("/api/admin/notification-templates?auto=false")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(manualList.status).toBe(200);
      expect(manualList.body.templates.every((t) => t.auto === false)).toBe(true);

      // Template create/update/delete validation & 404s
      expect(
        (
          await request(app)
            .post("/api/admin/notification-templates")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ name: "", titleTpl: "Hi" })
        ).status
      ).toBe(400);
      expect(
        (
          await request(app)
            .post("/api/admin/notification-templates")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ name: "X", titleTpl: "" })
        ).status
      ).toBe(400);
      expect(
        (
          await request(app)
            .post("/api/admin/notification-templates")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ name: "X", titleTpl: "Hi", channel: "sms" })
        ).status
      ).toBe(400);
      expect(
        (
          await request(app)
            .post("/api/admin/notification-templates")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ name: "X", titleTpl: "Hi", type: "invalid_t" })
        ).status
      ).toBe(400);

      expect(
        (
          await request(app)
            .patch("/api/admin/notification-templates/bad-id")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ name: "N" })
        ).status
      ).toBe(400);
      expect(
        (
          await request(app)
            .patch("/api/admin/notification-templates/507f1f77bcf86cd799439011")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ name: "N" })
        ).status
      ).toBe(404);
      expect(
        (
          await request(app)
            .delete("/api/admin/notification-templates/bad-id")
            .set("Authorization", `Bearer ${adminToken}`)
        ).status
      ).toBe(400);
      expect(
        (
          await request(app)
            .delete("/api/admin/notification-templates/507f1f77bcf86cd799439011")
            .set("Authorization", `Bearer ${adminToken}`)
        ).status
      ).toBe(404);

      // Minimal createNotification defaults & autoImage: "false", listNotifications defaults & ?status=all, template minimal create & partial update
      const minCreate = await request(app)
        .post("/api/admin/notifications")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "Minimal", autoImage: "false" });
      expect(minCreate.status).toBe(201);
      expect(minCreate.body.notification.autoImage).toBe(false);

      const defaultList = await request(app)
        .get("/api/admin/notifications?status=all&limit=200")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(defaultList.status).toBe(200);
      expect(defaultList.body.page).toBe(1);

      const minTpl = await request(app)
        .post("/api/admin/notification-templates")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Minimal Tpl", titleTpl: "Title" });
      expect(minTpl.status).toBe(201);

      const updMinTpl = await request(app)
        .patch(`/api/admin/notification-templates/${minTpl.body.template._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ titleTpl: "New Title", bodyTpl: "New Body", type: "sale" });
      expect(updMinTpl.status).toBe(200);
      expect(updMinTpl.body.template.bodyTpl).toBe("New Body");

      const noopUpdTpl = await request(app)
        .patch(`/api/admin/notification-templates/${minTpl.body.template._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});
      expect(noopUpdTpl.status).toBe(200);

      // Error 500 catches
      jest.spyOn(Notification, "find").mockImplementationOnce(() => {
        throw new Error("List DB error");
      });
      const listErr = await request(app)
        .get("/api/admin/notifications")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(listErr.status).toBe(500);

      jest.spyOn(NotificationTemplate, "find").mockImplementationOnce(() => {
        throw new Error("Tpl DB error");
      });
      const tplListErr = await request(app)
        .get("/api/admin/notification-templates")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(tplListErr.status).toBe(500);

      jest.spyOn(DeviceToken, "distinct").mockRejectedValueOnce(new Error("Aud DB error"));
      await Cart.create({
        customer: (await CustomerProfile.create({ authUserId: "err-c", isActive: true }))._id,
        items: [{ variant: new (await import("mongoose")).default.Types.ObjectId(), quantity: 1 }],
      });
      expect(
        (
          await request(app)
            .post("/api/admin/notifications/audience-count")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ segment: "never_ordered" })
        ).status
      ).toBe(500);

      jest.spyOn(Notification, "create").mockRejectedValueOnce(new Error("Create DB error"));
      expect(
        (
          await request(app)
            .post("/api/admin/notifications")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Err", channel: "web" })
        ).status
      ).toBe(500);

      jest
        .spyOn(Notification, "findOneAndUpdate")
        .mockRejectedValueOnce(new Error("Cancel DB error"));
      expect(
        (
          await request(app)
            .patch("/api/admin/notifications/507f1f77bcf86cd799439011/cancel")
            .set("Authorization", `Bearer ${adminToken}`)
        ).status
      ).toBe(500);

      jest
        .spyOn(Notification, "findByIdAndUpdate")
        .mockRejectedValueOnce(new Error("End DB error"));
      expect(
        (
          await request(app)
            .patch("/api/admin/notifications/507f1f77bcf86cd799439011/end-ticker")
            .set("Authorization", `Bearer ${adminToken}`)
        ).status
      ).toBe(500);

      jest
        .spyOn(NotificationTemplate, "create")
        .mockRejectedValueOnce(new Error("Create tpl DB error"));
      expect(
        (
          await request(app)
            .post("/api/admin/notification-templates")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ name: "E", titleTpl: "T" })
        ).status
      ).toBe(500);

      jest
        .spyOn(NotificationTemplate, "findById")
        .mockRejectedValueOnce(new Error("Upd tpl DB error"));
      expect(
        (
          await request(app)
            .patch("/api/admin/notification-templates/507f1f77bcf86cd799439011")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ name: "E" })
        ).status
      ).toBe(500);

      jest
        .spyOn(NotificationTemplate, "findById")
        .mockRejectedValueOnce(new Error("Del tpl DB error"));
      expect(
        (
          await request(app)
            .delete("/api/admin/notification-templates/507f1f77bcf86cd799439011")
            .set("Authorization", `Bearer ${adminToken}`)
        ).status
      ).toBe(500);
    });
  });
});
