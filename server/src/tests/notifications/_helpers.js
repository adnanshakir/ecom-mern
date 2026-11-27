import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

export function createNotificationTestMocks() {
  const state = {
    apps: [{ name: "default" }],
    sendCalls: [],
    sendEachCalls: [],
    multicastCalls: [],
    sendHandler: null,
    sendEachHandler: null,
    multicastHandler: null,
    cronJobs: [],
  };

  const reset = () => {
    state.apps = [{ name: "default" }];
    state.sendCalls.length = 0;
    state.sendEachCalls.length = 0;
    state.multicastCalls.length = 0;
    state.sendHandler = null;
    state.sendEachHandler = null;
    state.multicastHandler = null;
    state.cronJobs.length = 0;
    sendMock.mockClear();
    sendEachMock.mockClear();
    sendEachForMulticastMock.mockClear();
    getAppsMock.mockClear();
    initializeAppMock.mockClear();
    certMock.mockClear();
    cronScheduleMock.mockClear();
  };

  const getAppsMock = jest.fn(() => state.apps);
  const initializeAppMock = jest.fn((opts) => {
    const appObj = { opts };
    state.apps.push(appObj);
    return appObj;
  });
  const certMock = jest.fn((c) => ({ cert: c }));

  const sendMock = jest.fn(async (msg) => {
    state.sendCalls.push(msg);
    if (state.sendHandler) return state.sendHandler(msg);
    return "projects/test/messages/msg-1";
  });

  const sendEachMock = jest.fn(async (messages) => {
    state.sendEachCalls.push(messages);
    if (state.sendEachHandler) return state.sendEachHandler(messages);
    return {
      successCount: messages.length,
      failureCount: 0,
      responses: messages.map((_, idx) => ({
        success: true,
        messageId: `projects/test/messages/${idx}`,
      })),
    };
  });

  const sendEachForMulticastMock = jest.fn(async (payload) => {
    state.multicastCalls.push(payload);
    if (state.multicastHandler) return state.multicastHandler(payload);
    return {
      successCount: payload.tokens.length,
      failureCount: 0,
      responses: payload.tokens.map((_, idx) => ({
        success: true,
        messageId: `projects/test/messages/mc-${idx}`,
      })),
    };
  });

  const cronScheduleMock = jest.fn((expr, cb, opts) => {
    const job = { expr, cb, opts, stop: jest.fn() };
    state.cronJobs.push(job);
    return job;
  });

  jest.unstable_mockModule("firebase-admin/app", () => ({
    getApps: getAppsMock,
    initializeApp: initializeAppMock,
    cert: certMock,
  }));

  jest.unstable_mockModule("firebase-admin/messaging", () => ({
    getMessaging: () => ({
      send: sendMock,
      sendEach: sendEachMock,
      sendEachForMulticast: sendEachForMulticastMock,
    }),
  }));

  jest.unstable_mockModule("node-cron", () => ({
    default: { schedule: cronScheduleMock },
    schedule: cronScheduleMock,
  }));

  return {
    state,
    reset,
    setConfigured: (configured) => {
      state.apps = configured ? [{ name: "default" }] : [];
    },
    setSendHandler: (fn) => {
      state.sendHandler = fn;
    },
    setSendEachHandler: (fn) => {
      state.sendEachHandler = fn;
    },
    setMulticastHandler: (fn) => {
      state.multicastHandler = fn;
    },
    mocks: {
      sendMock,
      sendEachMock,
      sendEachForMulticastMock,
      getAppsMock,
      initializeAppMock,
      certMock,
      cronScheduleMock,
    },
  };
}

export function useFakeClock(isoOrMs) {
  jest.useFakeTimers({
    doNotFake: [
      "nextTick",
      "setImmediate",
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "queueMicrotask",
    ],
  });
  jest.setSystemTime(new Date(isoOrMs));
}

export async function flushPromises(ticks = 5) {
  for (let i = 0; i < ticks; i++) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}

export async function waitFor(assertion, { timeoutMs = 3000 } = {}) {
  const startNs = process.hrtime.bigint();
  const limitNs = BigInt(timeoutMs) * 1000000n;
  let lastErr;
  while (process.hrtime.bigint() - startNs < limitNs) {
    try {
      await assertion();
      return;
    } catch (err) {
      lastErr = err;
      await new Promise((resolve) => setImmediate(resolve));
    }
  }
  throw lastErr;
}

export async function createAdminUser(
  User,
  app,
  { role = "admin", email = "admin@test.com", name = "Admin" } = {}
) {
  const user = await User.create({
    name,
    email,
    password: "Test1234!",
    role,
  });
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "Test1234!" });
  return { user, token: loginRes.body.data.accessToken };
}

export function signExpiredAdminToken(user, secret) {
  return jwt.sign({ id: user._id.toString(), role: user.role, name: user.name }, secret, {
    expiresIn: -10,
  });
}

export function signCustomerTypedJwt(id, secret) {
  return jwt.sign({ id: String(id), type: "customer" }, secret, { expiresIn: "15m" });
}

export async function createCustomerSession(
  app,
  CustomerProfile,
  { phoneNumber, name = "Customer" }
) {
  await request(app)
    .post("/api/v1/customers/auth/phone-number/send-otp")
    .set("Origin", "http://localhost:3000")
    .send({ phoneNumber });

  const db = mongoose.connection.db;
  const doc = await db.collection("customerVerification").findOne({ identifier: phoneNumber });
  const code = doc?.value?.split(":")[0];

  const verifyRes = await request(app)
    .post("/api/v1/customers/auth/phone-number/verify")
    .set("Origin", "http://localhost:3000")
    .send({ phoneNumber, code });

  const cookies = verifyRes.headers["set-cookie"];
  const userId = verifyRes.body?.user?.id;
  if (userId && name) {
    await db.collection("customerUser").updateOne({ id: userId }, { $set: { name } });
  }
  const profile = await CustomerProfile.findOneAndUpdate(
    { authUserId: userId },
    { $setOnInsert: { authUserId: userId, isActive: true } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
  return { cookies, userId, profile };
}
