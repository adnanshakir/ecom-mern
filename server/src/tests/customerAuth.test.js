import { jest, describe, it, expect, beforeAll, afterEach, afterAll } from "@jest/globals";
import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import { connectTestDB, closeTestDB, clearTestDB } from "./setup.js";
import {
  createTestCustomerAuth,
  getTestCustomerAuthHandler,
} from "../config/customerAuth.test.config.js";

let testApp;

beforeAll(async () => {
  await connectTestDB();
  await createTestCustomerAuth();

  testApp = express();
  testApp.all("/api/v1/customers/auth/*splat", (req, res, next) => {
    return getTestCustomerAuthHandler()(req, res, next);
  });
  testApp.use(express.json());
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

// ---------------------------------------------------------------------------
// Helper: retrieve the OTP stored in the verification collection.
// The phoneNumber plugin stores verification value as "${code}:${attempts}",
// so we split on ":" and take the first segment.
// ---------------------------------------------------------------------------
async function getCapturedOTP(identifier) {
  const db = mongoose.connection.db;
  const doc = await db.collection("customerVerification").findOne({ identifier });
  if (!doc?.value) return null;
  return doc.value.split(":")[0];
}

/**
 * Full phone OTP sign-up/sign-in flow via HTTP.
 * Sends OTP then reads the code from the DB and verifies it.
 */
async function phoneSignUp(app, phoneNumber) {
  const sendRes = await request(app)
    .post("/api/v1/customers/auth/phone-number/send-otp")
    .set("Origin", "http://localhost:3000")
    .send({ phoneNumber });

  expect(sendRes.status).toBe(200);

  const code = await getCapturedOTP(phoneNumber);
  expect(code).toBeTruthy();

  const verifyRes = await request(app)
    .post("/api/v1/customers/auth/phone-number/verify")
    .set("Origin", "http://localhost:3000")
    .send({ phoneNumber, code });

  return { sendRes, verifyRes, code };
}

// ---------------------------------------------------------------------------
// Sign-up via phone OTP (the only allowed sign-up path)
// ---------------------------------------------------------------------------

describe("Customer Auth - Phone OTP sign-up", () => {
  it("creates a new account on first phone OTP verification", async () => {
    const { verifyRes } = await phoneSignUp(testApp, "+919876543210");

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.user).toBeDefined();
    expect(verifyRes.body.user.phoneNumber).toBe("+919876543210");
  });

  it("signs in an existing account on subsequent phone OTP verification", async () => {
    // First verify = sign-up
    await phoneSignUp(testApp, "+919876543210");

    // Second verify = sign-in (no new user created)
    const { verifyRes } = await phoneSignUp(testApp, "+919876543210");

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.user).toBeDefined();
    expect(verifyRes.body.user.phoneNumber).toBe("+919876543210");

    const db = mongoose.connection.db;
    const userCount = await db
      .collection("customerUser")
      .countDocuments({ phoneNumber: "+919876543210" });
    expect(userCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Phone number uniqueness (regression)
// ---------------------------------------------------------------------------

describe("Customer Auth - Phone Number Uniqueness Regression Tests", () => {
  it("allows multiple users with different phone numbers", async () => {
    await phoneSignUp(testApp, "+919876543210");
    await phoneSignUp(testApp, "+919876540000");

    const db = mongoose.connection.db;
    const count = await db.collection("customerUser").countDocuments({
      phoneNumber: { $in: ["+919876543210", "+919876540000"] },
    });
    expect(count).toBe(2);
  });

  it("re-throws createIndex failure in createCustomerAuth to prevent initialization without unique index", async () => {
    const { createCustomerAuth } = await import("../config/customerAuth.js");
    const db = mongoose.connection.db;
    const indexError = new Error("Index creation failed due to duplicate keys");

    const spy = jest.spyOn(db, "collection").mockReturnValueOnce({
      createIndex: jest.fn().mockRejectedValueOnce(indexError),
    });

    await expect(createCustomerAuth()).rejects.toThrow(
      "Index creation failed due to duplicate keys"
    );

    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Phone number validator — Indian format only
// ---------------------------------------------------------------------------

describe("Customer Auth - Phone number validation (Indian format)", () => {
  const sendOTP = (phone) =>
    request(testApp)
      .post("/api/v1/customers/auth/phone-number/send-otp")
      .set("Origin", "http://localhost:3000")
      .send({ phoneNumber: phone });

  // --- valid formats ---
  it("accepts 10-digit bare number (no country code)", async () => {
    const res = await sendOTP("9876543210");
    expect(res.status).toBe(200);
  });

  it("accepts +91 prefix with 10-digit number", async () => {
    const res = await sendOTP("+919876543210");
    expect(res.status).toBe(200);
  });

  it("accepts 91 prefix (no +) with 10-digit number", async () => {
    const res = await sendOTP("919876543210");
    expect(res.status).toBe(200);
  });

  it("accepts 10-digit number with + prefix (+9876543210)", async () => {
    const res = await sendOTP("+9876543210");
    expect(res.status).toBe(200);
  });

  // --- invalid formats ---
  it("rejects 10-digit number starting with invalid digit (e.g. 1234567890)", async () => {
    const res = await sendOTP("1234567890");
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("rejects a US-format number (+1 country code)", async () => {
    const res = await sendOTP("+15550001111");
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("rejects a number with fewer than 10 digits", async () => {
    const res = await sendOTP("+91987654");
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("rejects a number with more than 10 digits (not +91 form)", async () => {
    const res = await sendOTP("123456789012");
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("rejects an empty string", async () => {
    const res = await sendOTP("");
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("normalizes bare 10-digit inputs to canonical E.164 (+91XXXXXXXXXX) upon persistence", async () => {
    const { verifyRes } = await phoneSignUp(testApp, "9876543210");
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.user).toBeDefined();
    expect(verifyRes.body.user.phoneNumber).toBe("+919876543210");

    const db = mongoose.connection.db;
    const userDoc = await db.collection("customerUser").findOne({ phoneNumber: "+919876543210" });
    expect(userDoc).toBeDefined();
    expect(userDoc.phoneNumber).toBe("+919876543210");
  });
});

// ---------------------------------------------------------------------------
// emailOTP — must NOT create new accounts (disableSignUp: true)
// ---------------------------------------------------------------------------

describe("Customer Auth - emailOTP sign-in does not create new accounts", () => {
  it("allows the send-verification-otp call for an unknown email (send is always accepted)", async () => {
    // With disableSignUp: true, the send step still accepts any email address
    // (it doesn't know/check if the user exists at send time).
    const sendRes = await request(testApp)
      .post("/api/v1/customers/auth/email-otp/send-verification-otp")
      .set("Origin", "http://localhost:3000")
      .send({ email: "ghost@example.com", type: "sign-in" });

    // send returns 200 even for unknown emails — the block is at sign-in verify
    expect(sendRes.status).toBe(200);
  });

  it("rejects emailOTP sign-in verify for an email with no matching user (disableSignUp: true)", async () => {
    // Step 1: send the OTP (this always succeeds)
    const sendRes = await request(testApp)
      .post("/api/v1/customers/auth/email-otp/send-verification-otp")
      .set("Origin", "http://localhost:3000")
      .send({ email: "ghost@example.com", type: "sign-in" });

    expect(sendRes.status).toBe(200);

    // Step 2: retrieve the captured OTP and attempt sign-in
    // The verify collection identifier for emailOTP uses "sign-in-otp-{email}"
    const code = await getCapturedOTP("sign-in-otp-ghost@example.com");
    // Fallback: try the email directly as identifier
    const fallbackCode = code ?? (await getCapturedOTP("ghost@example.com"));

    // The sign-in verify step should reject because no user has this email and
    // disableSignUp is true, so no account is auto-created.
    const signInRes = await request(testApp)
      .post("/api/v1/customers/auth/sign-in/email-otp")
      .set("Origin", "http://localhost:3000")
      .send({ email: "ghost@example.com", otp: fallbackCode || "000000" });

    // Should fail: either the user doesn't exist (404/400) or invalid OTP
    expect(signInRes.status).toBeGreaterThanOrEqual(400);
    expect(signInRes.status).toBeLessThan(500);

    // Critical: no user document should have been created
    const db = mongoose.connection.db;
    const count = await db
      .collection("customerUser")
      .countDocuments({ email: "ghost@example.com" });
    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Dead password-based endpoints must return 4xx (better-auth returns 400,
// not 404, when emailAndPassword is disabled — the route still exists in
// better-auth's router but is gated at the handler level)
// ---------------------------------------------------------------------------

describe("Customer Auth - password-based endpoints are disabled", () => {
  it("POST /sign-up/email returns 4xx (email+password disabled)", async () => {
    const res = await request(testApp)
      .post("/api/v1/customers/auth/sign-up/email")
      .set("Origin", "http://localhost:3000")
      .send({
        name: "Ghost",
        email: "ghost@example.com",
        password: "Password123!",
      });

    // better-auth returns 400 when emailAndPassword is not enabled
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("POST /sign-in/email returns 4xx (email+password disabled)", async () => {
    const res = await request(testApp)
      .post("/api/v1/customers/auth/sign-in/email")
      .set("Origin", "http://localhost:3000")
      .send({ email: "ghost@example.com", password: "Password123!" });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("no new user is created when hitting the disabled /sign-up/email endpoint", async () => {
    await request(testApp)
      .post("/api/v1/customers/auth/sign-up/email")
      .set("Origin", "http://localhost:3000")
      .send({
        name: "Ghost",
        email: "ghost@example.com",
        password: "Password123!",
      });

    const db = mongoose.connection.db;
    const count = await db
      .collection("customerUser")
      .countDocuments({ email: "ghost@example.com" });
    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// baseURL validation in production (unchanged)
// ---------------------------------------------------------------------------

describe("Customer Auth - baseURL validation in production", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalBetterAuthUrl = process.env.BETTER_AUTH_URL;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalBetterAuthUrl !== undefined) {
      process.env.BETTER_AUTH_URL = originalBetterAuthUrl;
    } else {
      delete process.env.BETTER_AUTH_URL;
    }
  });

  it("throws when BETTER_AUTH_URL is missing in production", async () => {
    const { createCustomerAuth } = await import("../config/customerAuth.js");
    process.env.NODE_ENV = "production";
    delete process.env.BETTER_AUTH_URL;

    await expect(createCustomerAuth()).rejects.toThrow(
      "BETTER_AUTH_URL environment variable is required in production"
    );
  });

  it("throws when BETTER_AUTH_URL is HTTP in production", async () => {
    const { createCustomerAuth } = await import("../config/customerAuth.js");
    process.env.NODE_ENV = "production";
    process.env.BETTER_AUTH_URL = "http://auth.example.com";

    await expect(createCustomerAuth()).rejects.toThrow(
      "BETTER_AUTH_URL must be a valid public HTTPS origin in production"
    );
  });

  it("throws when BETTER_AUTH_URL is localhost in production", async () => {
    const { createCustomerAuth } = await import("../config/customerAuth.js");
    process.env.NODE_ENV = "production";
    process.env.BETTER_AUTH_URL = "https://localhost:5000";

    await expect(createCustomerAuth()).rejects.toThrow(
      "BETTER_AUTH_URL must be a valid public HTTPS origin in production"
    );
  });

  it("allows valid public HTTPS origin in production", async () => {
    const { createCustomerAuth } = await import("../config/customerAuth.js");
    process.env.NODE_ENV = "production";
    process.env.BETTER_AUTH_URL = "https://auth.example.com";

    const instance = await createCustomerAuth();
    expect(instance).toBeDefined();
    expect(instance.options.baseURL).toBe("https://auth.example.com");
  });
});

// ---------------------------------------------------------------------------
// Attach & verify phone number flow (updatePhoneNumber: true)
// ---------------------------------------------------------------------------

describe("Customer Auth - Attach phone number to authenticated session", () => {
  it("attaches and verifies phone number when updatePhoneNumber: true is passed with a session", async () => {
    const { verifyRes: firstVerifyRes } = await phoneSignUp(testApp, "+919876543210");
    expect(firstVerifyRes.status).toBe(200);
    const cookies = firstVerifyRes.headers["set-cookie"];
    expect(cookies).toBeDefined();

    const newPhone = "+919123456789";
    const sendRes = await request(testApp)
      .post("/api/v1/customers/auth/phone-number/send-otp")
      .set("Origin", "http://localhost:3000")
      .send({ phoneNumber: newPhone });
    expect(sendRes.status).toBe(200);

    const code = await getCapturedOTP(newPhone);
    expect(code).toBeTruthy();

    const updateRes = await request(testApp)
      .post("/api/v1/customers/auth/phone-number/verify")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", cookies)
      .send({ phoneNumber: newPhone, code, updatePhoneNumber: true });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.user).toBeDefined();
    expect(updateRes.body.user.phoneNumber).toBe(newPhone);
    expect(updateRes.body.user.phoneNumberVerified).toBe(true);

    const db = mongoose.connection.db;
    const userDoc = await db.collection("customerUser").findOne({ phoneNumber: newPhone });
    expect(userDoc).toBeDefined();
    expect(userDoc.phoneNumber).toBe(newPhone);
  });
});

// ---------------------------------------------------------------------------
// Master OTP testing bypass
// ---------------------------------------------------------------------------

describe("Customer Auth - Master OTP Feature", () => {
  const origAllow = process.env.ALLOW_MASTER_OTP;
  const origCode = process.env.MASTER_OTP_CODE;

  afterEach(() => {
    if (origAllow !== undefined) process.env.ALLOW_MASTER_OTP = origAllow;
    else delete process.env.ALLOW_MASTER_OTP;
    if (origCode !== undefined) process.env.MASTER_OTP_CODE = origCode;
    else delete process.env.MASTER_OTP_CODE;
  });

  it("completes phone verification with master OTP code when ALLOW_MASTER_OTP=true", async () => {
    process.env.ALLOW_MASTER_OTP = "true";
    process.env.MASTER_OTP_CODE = "999999";

    const masterPhone = "+919988776655";

    const verifyRes = await request(testApp)
      .post("/api/v1/customers/auth/phone-number/verify")
      .set("Origin", "http://localhost:3000")
      .send({ phoneNumber: masterPhone, code: "999999" });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.user).toBeDefined();
    expect(verifyRes.body.user.phoneNumber).toBe(masterPhone);
  });

  it("rejects master OTP code when ALLOW_MASTER_OTP is not set or false", async () => {
    process.env.ALLOW_MASTER_OTP = "false";
    process.env.MASTER_OTP_CODE = "999999";

    const masterPhone = "+919988776655";

    const verifyRes = await request(testApp)
      .post("/api/v1/customers/auth/phone-number/verify")
      .set("Origin", "http://localhost:3000")
      .send({ phoneNumber: masterPhone, code: "999999" });

    expect(verifyRes.status).toBeGreaterThanOrEqual(400);
  });

  it("completes email OTP sign-in for existing user with master OTP code when ALLOW_MASTER_OTP=true", async () => {
    process.env.ALLOW_MASTER_OTP = "true";
    process.env.MASTER_OTP_CODE = "999999";

    const { verifyRes: phoneRes } = await phoneSignUp(testApp, "+919988771122");
    expect(phoneRes.status).toBe(200);
    const userId = phoneRes.body.user.id;

    const db = mongoose.connection.db;
    const ObjectId = mongoose.Types.ObjectId;
    const filter = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { _id: userId };
    await db.collection("customerUser").updateOne(filter, { $set: { email: "master@example.com" } });

    const signInRes = await request(testApp)
      .post("/api/v1/customers/auth/sign-in/email-otp")
      .set("Origin", "http://localhost:3000")
      .send({ email: "master@example.com", otp: "999999" });

    expect(signInRes.status).toBe(200);
    expect(signInRes.body.user).toBeDefined();
    expect(signInRes.body.user.email).toBe("master@example.com");
  });
});


