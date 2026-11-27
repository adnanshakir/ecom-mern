import { jest } from "@jest/globals";
import { createNotificationTestMocks, useFakeClock } from "./_helpers.js";

await import("../../config/config.js");
delete process.env.FIREBASE_SERVICE_ACCOUNT_B64;
delete process.env.ENABLE_PUSH_STUB;

const mockCtrl = createNotificationTestMocks();

const { sendToCustomer, sendPersonalBatch, applyCooldown, filterAllowed, sendToTopic } =
  await import("../../services/notificationService.js");
const { default: CustomerProfile } = await import("../../models/customer/customer.model.js");
const { default: DeviceToken } = await import("../../models/DeviceToken.js");
const { default: NotificationLog } = await import("../../models/NotificationLog.js");
const { connectTestDB, closeTestDB, clearTestDB } = await import("../setup.js");

beforeAll(async () => {
  await connectTestDB();
}, 30000);

beforeEach(async () => {
  mockCtrl.reset();
  await clearTestDB();
  process.env.NODE_ENV = "test";
  delete process.env.ENABLE_PUSH_STUB;
  delete process.env.PUSH_ALLOWLIST_CUSTOMER_IDS;
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  delete process.env.PUSH_ALLOWLIST_CUSTOMER_IDS;
});

afterAll(async () => {
  await closeTestDB();
});

describe("sendToCustomer()", () => {
  it("does nothing when customer has no device tokens", async () => {
    const c = await CustomerProfile.create({ authUserId: "u-none", isActive: true });
    await sendToCustomer(c._id, { title: "Hi", body: "There" });
    expect(mockCtrl.mocks.sendEachForMulticastMock).toHaveBeenCalledTimes(0);
    expect(await NotificationLog.countDocuments()).toBe(0);
  });

  it("sends to all devices of a customer, deletes invalid/unregistered tokens, keeps other customers' tokens and invalid-argument tokens", async () => {
    const c1 = await CustomerProfile.create({ authUserId: "u1", isActive: true });
    const c2 = await CustomerProfile.create({ authUserId: "u2", isActive: true });

    await DeviceToken.insertMany([
      { customer: c1._id, token: "tok-ok" },
      { customer: c1._id, token: "tok-unreg" },
      { customer: c1._id, token: "tok-bad-arg" },
      { customer: c2._id, token: "tok-other" },
    ]);

    mockCtrl.setMulticastHandler(async (payload) => {
      const responses = payload.tokens.map((t) => {
        if (t === "tok-ok") return { success: true, messageId: "m1" };
        if (t === "tok-unreg") {
          return {
            success: false,
            error: {
              code: "messaging/registration-token-not-registered",
              message: "Not registered",
            },
          };
        }
        return {
          success: false,
          error: { code: "messaging/invalid-argument", message: "Bad payload" },
        };
      });
      return { successCount: 1, failureCount: 2, responses };
    });

    await expect(
      sendToCustomer(c1._id, { title: "Hello", body: "World", link: "/orders" })
    ).rejects.toThrow("Customer push notification partially or fully failed: Bad payload");

    expect(mockCtrl.mocks.sendEachForMulticastMock).toHaveBeenCalledTimes(1);
    expect(mockCtrl.state.multicastCalls[0].tokens).toEqual(["tok-ok", "tok-unreg", "tok-bad-arg"]);

    const remaining = (await DeviceToken.find().lean()).map((d) => d.token).sort();
    expect(remaining).toEqual(["tok-bad-arg", "tok-ok", "tok-other"]);
  });

  it("retries retryable failures exactly once without re-sending to successful recipients, then throws if still failing", async () => {
    const c1 = await CustomerProfile.create({ authUserId: "u1", isActive: true });
    await DeviceToken.insertMany([
      { customer: c1._id, token: "tok-ok" },
      { customer: c1._id, token: "tok-retry-pass" },
      { customer: c1._id, token: "tok-retry-fail" },
    ]);

    let call = 0;
    mockCtrl.setMulticastHandler(async (payload) => {
      call++;
      if (call === 1) {
        return {
          successCount: 1,
          failureCount: 2,
          responses: [
            { success: true, messageId: "m1" },
            {
              success: false,
              error: { code: "messaging/server-unavailable", message: "Unavailable" },
            },
            { success: false, error: { code: "messaging/quota-exceeded", message: "Quota" } },
          ],
        };
      }
      return {
        successCount: 1,
        failureCount: 1,
        responses: payload.tokens.map((t) =>
          t === "tok-retry-pass"
            ? { success: true, messageId: "m2" }
            : {
                success: false,
                error: { code: "messaging/quota-exceeded", message: "Quota again" },
              }
        ),
      };
    });

    await expect(sendToCustomer(c1._id, { title: "Hi", body: "Test" })).rejects.toThrow(
      "Quota again"
    );
    expect(mockCtrl.mocks.sendEachForMulticastMock).toHaveBeenCalledTimes(2);
    expect(mockCtrl.state.multicastCalls[0].tokens).toEqual([
      "tok-ok",
      "tok-retry-pass",
      "tok-retry-fail",
    ]);
    expect(mockCtrl.state.multicastCalls[1].tokens).toEqual(["tok-retry-pass", "tok-retry-fail"]);
  });

  it("surfaces non-retryable failures without retrying", async () => {
    const c1 = await CustomerProfile.create({ authUserId: "u1", isActive: true });
    await DeviceToken.create({ customer: c1._id, token: "tok-perm" });

    mockCtrl.setMulticastHandler(async () => ({
      successCount: 0,
      failureCount: 1,
      responses: [
        {
          success: false,
          error: { code: "messaging/sender-id-mismatch", message: "Sender mismatch" },
        },
      ],
    }));

    await expect(sendToCustomer(c1._id, { title: "Hi" })).rejects.toThrow("Sender mismatch");
    expect(mockCtrl.mocks.sendEachForMulticastMock).toHaveBeenCalledTimes(1);
    expect(await DeviceToken.countDocuments({ token: "tok-perm" })).toBe(1);
  });

  it("handles retry exception, retry invalid-token deletion, and push stub paths cleanly", async () => {
    const c1 = await CustomerProfile.create({ authUserId: "u-r-ex", isActive: true });
    await DeviceToken.insertMany([
      { customer: c1._id, token: "tok-r-throw" },
      { customer: c1._id, token: "tok-r-unreg" },
    ]);

    let call = 0;
    mockCtrl.setMulticastHandler(async () => {
      call++;
      if (call === 1) {
        return {
          successCount: 0,
          failureCount: 2,
          responses: [
            { success: false, error: { code: "messaging/server-unavailable", message: "Retry 1" } },
            { success: false, error: { code: "messaging/unavailable", message: "Retry 2" } },
          ],
        };
      }
      return {
        successCount: 0,
        failureCount: 2,
        responses: [
          { success: false, error: { code: "messaging/internal-error", message: "Still failing" } },
          {
            success: false,
            error: { code: "messaging/registration-token-not-registered", message: "Gone" },
          },
        ],
      };
    });

    await expect(sendToCustomer(c1._id, { title: "Retry" })).rejects.toThrow("Still failing");
    expect(await DeviceToken.countDocuments({ token: "tok-r-unreg" })).toBe(0);
    expect(await DeviceToken.countDocuments({ token: "tok-r-throw" })).toBe(1);

    // Retry itself throws
    call = 0;
    mockCtrl.setMulticastHandler(async () => {
      call++;
      if (call === 1) {
        return {
          successCount: 0,
          failureCount: 1,
          responses: [{ success: false, error: { code: "messaging/unavailable", message: "Tmp" } }],
        };
      }
      throw new Error("Network reset");
    });
    await expect(sendToCustomer(c1._id, { title: "Retry Throw" })).rejects.toThrow("Network reset");

    // Stub paths when Firebase is not configured and ENABLE_PUSH_STUB=true
    mockCtrl.setConfigured(false);
    process.env.ENABLE_PUSH_STUB = "true";
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const custRes = await sendToCustomer(c1._id, { title: "Stub Cust", body: "Body" });
    expect(custRes).toEqual({ ok: true, stub: true });
    const topicRes = await sendToTopic({ title: "Stub Topic", body: "Body" });
    expect(topicRes).toEqual({ ok: true, stub: true });
    const batchRes = await sendPersonalBatch([{ customerId: c1._id, title: "Stub Batch" }], {
      key: "k",
    });
    expect(batchRes).toEqual({ targeted: 1, withDevice: 1, delivered: 1, failed: 0 });
    expect(logSpy).toHaveBeenCalled();

    // Unconfigured without stub throws on sendToCustomer and sendPersonalBatch
    delete process.env.ENABLE_PUSH_STUB;
    await expect(sendToCustomer(c1._id, { title: "Fail" })).rejects.toThrow(
      "Push notifications disabled: Firebase is not configured"
    );
    await expect(
      sendPersonalBatch([{ customerId: c1._id, title: "Fail" }], { key: "k" })
    ).rejects.toThrow("Push notifications disabled: Firebase is not configured");

    // sendPersonalBatch cleanup error paths (with and without sendError)
    mockCtrl.setConfigured(true);
    jest.spyOn(NotificationLog, "insertMany").mockRejectedValueOnce(new Error("Log insert failed"));
    await expect(
      sendPersonalBatch([{ customerId: c1._id, title: "LogFail" }], { key: "k" })
    ).rejects.toThrow("Log insert failed");

    mockCtrl.setSendEachHandler(async () => {
      throw new Error("SendEach boom");
    });
    jest.spyOn(NotificationLog, "insertMany").mockRejectedValueOnce(new Error("Cleanup fail"));
    await expect(
      sendPersonalBatch([{ customerId: c1._id, title: "BothFail" }], { key: "k" })
    ).rejects.toThrow("SendEach boom");
  });
});

describe("sendPersonalBatch()", () => {
  it("chunks 1001 messages into 3 sendEach calls (500, 500, 1)", async () => {
    const customers = await CustomerProfile.insertMany(
      Array.from({ length: 1001 }, (_, i) => ({ authUserId: `chunk-u-${i}`, isActive: true }))
    );
    await DeviceToken.insertMany(customers.map((c, i) => ({ customer: c._id, token: `tok-${i}` })));

    const items = customers.map((c, i) => ({
      customerId: c._id,
      title: `Msg ${i}`,
      body: "Body",
      link: "/cart",
    }));

    const stats = await sendPersonalBatch(items, { key: "campaign", marketing: true });
    expect(mockCtrl.mocks.sendEachMock).toHaveBeenCalledTimes(3);
    expect(mockCtrl.state.sendEachCalls[0]).toHaveLength(500);
    expect(mockCtrl.state.sendEachCalls[1]).toHaveLength(500);
    expect(mockCtrl.state.sendEachCalls[2]).toHaveLength(1);
    expect(stats).toEqual({ targeted: 1001, withDevice: 1001, delivered: 1001, failed: 0 });
    expect(await NotificationLog.countDocuments({ key: "campaign" })).toBe(1001);
  });

  it("writes NotificationLog only for customers with >= 1 delivery and cleans invalid tokens without deleting invalid-argument", async () => {
    const c1 = await CustomerProfile.create({ authUserId: "b1", isActive: true });
    const c2 = await CustomerProfile.create({ authUserId: "b2", isActive: true });
    const c3 = await CustomerProfile.create({ authUserId: "b3", isActive: true });

    await DeviceToken.insertMany([
      { customer: c1._id, token: "tok-c1-ok" },
      { customer: c1._id, token: "tok-c1-bad" },
      { customer: c2._id, token: "tok-c2-unreg" },
      { customer: c3._id, token: "tok-c3-invarg" },
    ]);

    mockCtrl.setSendEachHandler(async (msgs) => ({
      successCount: 1,
      failureCount: 3,
      responses: msgs.map((m) => {
        if (m.token === "tok-c1-ok") return { success: true, messageId: "m1" };
        if (m.token === "tok-c2-unreg") {
          return { success: false, error: { code: "messaging/invalid-registration-token" } };
        }
        if (m.token === "tok-c1-bad") {
          return { success: false, error: { code: "messaging/registration-token-not-registered" } };
        }
        return { success: false, error: { code: "messaging/invalid-argument" } };
      }),
    }));

    const stats = await sendPersonalBatch(
      [
        { customerId: c1._id, title: "T1" },
        { customerId: c2._id, title: "T2" },
        { customerId: c3._id, title: "T3" },
      ],
      { key: "price_drop", marketing: true }
    );

    expect(stats).toEqual({ targeted: 3, withDevice: 3, delivered: 1, failed: 3 });

    const logs = await NotificationLog.find().lean();
    expect(logs).toHaveLength(1);
    expect(String(logs[0].customer)).toBe(String(c1._id));
    expect(logs[0].key).toBe("price_drop");

    const remainingTokens = (await DeviceToken.find().lean()).map((d) => d.token).sort();
    expect(remainingTokens).toEqual(["tok-c1-ok", "tok-c3-invarg"]);
  });
});

describe("applyCooldown()", () => {
  it("enforces exact 24h marketing cap and per-key cooldown boundaries, and exempts non-marketing sends", async () => {
    const fixedNow = "2026-11-27T12:00:00.000Z";
    useFakeClock(fixedNow);
    const nowMs = Date.now();

    const cBlockedCap = await CustomerProfile.create({ authUserId: "u-cap-block", isActive: true });
    const cExactCap = await CustomerProfile.create({ authUserId: "u-cap-exact", isActive: true });
    const cBlockedKey = await CustomerProfile.create({ authUserId: "u-key-block", isActive: true });
    const cExactKey = await CustomerProfile.create({ authUserId: "u-key-exact", isActive: true });
    const cNonMkt = await CustomerProfile.create({ authUserId: "u-nonmkt", isActive: true });

    await NotificationLog.insertMany([
      // 23h59m ago on different marketing key -> blocked by 24h marketing cap
      {
        customer: cBlockedCap._id,
        key: "price_drop",
        marketing: true,
        sentAt: new Date(nowMs - (24 * 3600 - 60) * 1000),
      },
      // 24h00m ago on different marketing key -> allowed
      {
        customer: cExactCap._id,
        key: "price_drop",
        marketing: true,
        sentAt: new Date(nowMs - 24 * 3600 * 1000),
      },
      // 71h59m ago on same key -> blocked by 72h key cooldown
      {
        customer: cBlockedKey._id,
        key: "cart_reminder",
        marketing: true,
        sentAt: new Date(nowMs - (72 * 3600 - 60) * 1000),
      },
      // 72h00m ago on same key -> allowed
      {
        customer: cExactKey._id,
        key: "cart_reminder",
        marketing: true,
        sentAt: new Date(nowMs - 72 * 3600 * 1000),
      },
      // 1h ago non-marketing -> does NOT block marketing cap
      {
        customer: cNonMkt._id,
        key: "order_shipped",
        marketing: false,
        sentAt: new Date(nowMs - 3600 * 1000),
      },
    ]);

    const input = [cBlockedCap, cExactCap, cBlockedKey, cExactKey, cNonMkt].map((c) => ({
      customerId: c._id,
      title: "Cart",
    }));

    const allowedMarketing = await applyCooldown(input, {
      key: "cart_reminder",
      cooldownHours: 72,
      marketing: true,
    });
    expect(allowedMarketing.map((i) => String(i.customerId))).toEqual([
      String(cExactCap._id),
      String(cExactKey._id),
      String(cNonMkt._id),
    ]);

    // Non-marketing send is exempt from 24h marketing cap
    const allowedNonMarketing = await applyCooldown(
      [{ customerId: cBlockedCap._id, title: "Order" }],
      { key: "order_shipped", cooldownHours: 0, marketing: false }
    );
    expect(allowedNonMarketing).toHaveLength(1);
  });
});

describe("PUSH_ALLOWLIST_CUSTOMER_IDS", () => {
  it("restricts personal pushes before token lookup and logging while leaving topic broadcasts unaffected", async () => {
    const c1 = await CustomerProfile.create({ authUserId: "al-1", isActive: true });
    const c2 = await CustomerProfile.create({ authUserId: "al-2", isActive: true });
    await DeviceToken.create({ customer: c1._id, token: "tok-al-1" });
    await DeviceToken.create({ customer: c2._id, token: "tok-al-2" });

    process.env.PUSH_ALLOWLIST_CUSTOMER_IDS = String(c1._id);
    expect(filterAllowed([c1._id, c2._id])).toEqual([c1._id]);

    const findSpy = jest.spyOn(DeviceToken, "find");

    // Skipped customer in sendToCustomer never queries DeviceToken
    await sendToCustomer(c2._id, { title: "Blocked" });
    expect(findSpy).toHaveBeenCalledTimes(0);
    expect(mockCtrl.mocks.sendEachForMulticastMock).toHaveBeenCalledTimes(0);

    // Allowed customer in sendToCustomer sends normally
    await sendToCustomer(c1._id, { title: "Allowed" });
    expect(mockCtrl.mocks.sendEachForMulticastMock).toHaveBeenCalledTimes(1);
    expect(mockCtrl.state.multicastCalls[0].tokens).toEqual(["tok-al-1"]);

    // Batch only targets/logs allowlisted customer
    const stats = await sendPersonalBatch(
      [
        { customerId: c1._id, title: "T1" },
        { customerId: c2._id, title: "T2" },
      ],
      { key: "campaign" }
    );
    expect(stats).toEqual({ targeted: 1, withDevice: 1, delivered: 1, failed: 0 });
    expect(mockCtrl.mocks.sendEachMock).toHaveBeenCalledTimes(1);
    expect(mockCtrl.state.sendEachCalls[0]).toHaveLength(1);
    expect(mockCtrl.state.sendEachCalls[0][0].token).toBe("tok-al-1");
    expect(await NotificationLog.countDocuments()).toBe(1);

    // Topic broadcast unaffected
    await sendToTopic({ title: "Public" });
    expect(mockCtrl.mocks.sendMock).toHaveBeenCalledTimes(1);

    // Empty allowlist allows everyone
    delete process.env.PUSH_ALLOWLIST_CUSTOMER_IDS;
    const statsAll = await sendPersonalBatch(
      [
        { customerId: c1._id, title: "T1" },
        { customerId: c2._id, title: "T2" },
      ],
      { key: "campaign" }
    );
    expect(statsAll).toEqual({ targeted: 2, withDevice: 2, delivered: 2, failed: 0 });
  });
});
