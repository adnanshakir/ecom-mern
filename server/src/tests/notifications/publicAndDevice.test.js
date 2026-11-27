import { jest } from "@jest/globals";
import request from "supertest";
import { createNotificationTestMocks, createCustomerSession, useFakeClock } from "./_helpers.js";

await import("../../config/config.js");
delete process.env.FIREBASE_SERVICE_ACCOUNT_B64;
delete process.env.ENABLE_PUSH_STUB;

const mockCtrl = createNotificationTestMocks();

const { default: app } = await import("../../app.js");
const { createCustomerAuth } = await import("../../config/customerAuth.js");
const { default: Notification } = await import("../../models/Notification.js");
const { default: CustomerProfile } = await import("../../models/customer/customer.model.js");
const { default: DeviceToken } = await import("../../models/DeviceToken.js");
const { connectTestDB, closeTestDB, clearTestDB } = await import("../setup.js");

beforeAll(async () => {
  await connectTestDB();
  await createCustomerAuth();
}, 30000);

beforeEach(async () => {
  mockCtrl.reset();
  await clearTestDB();
});

afterEach(() => {
  jest.useRealTimers();
});

afterAll(async () => {
  await closeTestDB();
});

describe("Public ticker & Customer device tokens", () => {
  describe("GET /api/public/ticker", () => {
    it("returns only sent web/both items with future tickerEndsAt, newest first, max 5, exact shape, and Cache-Control without auth", async () => {
      useFakeClock("2026-11-27T12:00:00.000Z");
      const now = Date.now();

      // Excluded items
      await Notification.create([
        {
          title: "Expired",
          channel: "web",
          status: "sent",
          sentAt: new Date(now - 1000),
          tickerEndsAt: new Date(now - 1),
        },
        {
          title: "ExactNow",
          channel: "both",
          status: "sent",
          sentAt: new Date(now - 1000),
          tickerEndsAt: new Date(now),
        },
        {
          title: "Cancelled",
          channel: "web",
          status: "cancelled",
          sentAt: new Date(now - 1000),
          tickerEndsAt: new Date(now + 60000),
        },
        {
          title: "Scheduled",
          channel: "web",
          status: "scheduled",
          tickerEndsAt: new Date(now + 60000),
        },
        { title: "Failed", channel: "web", status: "failed", tickerEndsAt: new Date(now + 60000) },
        {
          title: "AppOnly",
          channel: "app",
          status: "sent",
          sentAt: new Date(now - 1000),
          tickerEndsAt: new Date(now + 60000),
        },
      ]);

      // 7 valid items -> should return newest 5 only
      for (let i = 1; i <= 7; i++) {
        await Notification.create({
          title: `Live ${i}`,
          body: i === 7 ? "Final Sale" : "",
          link: `/promo-${i}`,
          channel: i % 2 === 0 ? "both" : "web",
          status: "sent",
          sentAt: new Date(now + i * 1000),
          tickerEndsAt: new Date(now + 3600 * 1000),
        });
      }

      const res = await request(app).get("/api/public/ticker");
      expect(res.status).toBe(200);
      expect(res.headers["cache-control"]).toBe("public, max-age=60");
      expect(res.body.items).toHaveLength(5);
      expect(res.body.items.map((x) => x.text)).toEqual([
        "Live 7 — Final Sale",
        "Live 6",
        "Live 5",
        "Live 4",
        "Live 3",
      ]);

      for (const item of res.body.items) {
        expect(Object.keys(item).sort()).toEqual(["_id", "link", "text"]);
      }
    });
  });

  describe("/api/customer/devices", () => {
    it("requires customer auth and rejects missing, empty, whitespace, and non-string/NoSQL tokens with 400", async () => {
      const noAuth = await request(app).post("/api/customer/devices").send({ token: "tok-1" });
      expect(noAuth.status).toBe(401);

      const { cookies } = await createCustomerSession(app, CustomerProfile, {
        phoneNumber: "+919876543210",
        name: "Aisha",
      });

      for (const body of [
        {},
        { token: "" },
        { token: "   " },
        { token: 12345 },
        { token: { $ne: null } },
      ]) {
        const res = await request(app)
          .post("/api/customer/devices")
          .set("Cookie", cookies)
          .send(body);
        expect(res.status).toBe(400);

        const delRes = await request(app)
          .delete("/api/customer/devices")
          .set("Cookie", cookies)
          .send(body);
        expect(delRes.status).toBe(400);
      }
      expect(await DeviceToken.countDocuments()).toBe(0);
    });

    it("is idempotent on duplicate registration, moves token between customers, and prevents cross-customer unregister", async () => {
      const c1 = await createCustomerSession(app, CustomerProfile, {
        phoneNumber: "+919876543211",
        name: "Customer 1",
      });
      const c2 = await createCustomerSession(app, CustomerProfile, {
        phoneNumber: "+919876543212",
        name: "Customer 2",
      });

      // Register same token twice for c1 -> leaves 1 doc
      const r1 = await request(app)
        .post("/api/customer/devices")
        .set("Cookie", c1.cookies)
        .send({ token: "shared-device-tok", platform: "android" });
      expect(r1.status).toBe(200);

      const r2 = await request(app)
        .post("/api/customer/devices")
        .set("Cookie", c1.cookies)
        .send({ token: "shared-device-tok", platform: "ios" });
      expect(r2.status).toBe(200);
      expect(await DeviceToken.countDocuments({ token: "shared-device-tok" })).toBe(1);

      // c2 cannot delete c1's token
      const badDel = await request(app)
        .delete("/api/customer/devices")
        .set("Cookie", c2.cookies)
        .send({ token: "shared-device-tok" });
      expect(badDel.status).toBe(200);
      const stillOwnedByC1 = await DeviceToken.findOne({ token: "shared-device-tok" }).lean();
      expect(String(stillOwnedByC1.customer)).toBe(String(c1.profile._id));

      // Registering same token by c2 MOVES ownership to c2 (never two owners)
      const moveRes = await request(app)
        .post("/api/customer/devices")
        .set("Cookie", c2.cookies)
        .send({ token: "shared-device-tok", platform: "android" });
      expect(moveRes.status).toBe(200);
      expect(await DeviceToken.countDocuments({ token: "shared-device-tok" })).toBe(1);
      const nowOwnedByC2 = await DeviceToken.findOne({ token: "shared-device-tok" }).lean();
      expect(String(nowOwnedByC2.customer)).toBe(String(c2.profile._id));

      // c2 unregisters own token -> deleted
      const okDel = await request(app)
        .delete("/api/customer/devices")
        .set("Cookie", c2.cookies)
        .send({ token: "shared-device-tok" });
      expect(okDel.status).toBe(200);
      expect(await DeviceToken.countDocuments({ token: "shared-device-tok" })).toBe(0);
    });
  });
});
