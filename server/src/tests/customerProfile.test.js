import { jest, describe, it, expect, beforeAll, afterEach, afterAll } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import app from "../app.js";
import { connectTestDB, closeTestDB, clearTestDB } from "./setup.js";
import { createCustomerAuth } from "../config/customerAuth.js";
beforeAll(async () => {
  await connectTestDB();
  await createCustomerAuth();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

async function getCapturedOTP(identifier) {
  const db = mongoose.connection.db;
  let doc = await db.collection("customerVerification").findOne({ identifier });
  if (!doc?.value) return null;
  return doc.value.split(":")[0];
}

async function loginWithPhone(phoneNumber) {
  await request(app)
    .post("/api/v1/customers/auth/phone-number/send-otp")
    .set("Origin", "http://localhost:3000")
    .send({ phoneNumber });

  const code = await getCapturedOTP(phoneNumber);
  const verifyRes = await request(app)
    .post("/api/v1/customers/auth/phone-number/verify")
    .set("Origin", "http://localhost:3000")
    .send({ phoneNumber, code });

  const cookies = verifyRes.headers["set-cookie"];
  return { verifyRes, cookies };
}

describe("Customer Profile Single-Route API (/api/customers/profile)", () => {
  it("GET /api/customers/profile returns 401 when unauthenticated", async () => {
    const res = await request(app).get("/api/customers/profile");
    expect(res.status).toBe(401);
  });

  it("GET /api/customers/profile returns current user profile when authenticated", async () => {
    const { cookies } = await loginWithPhone("+919876543210");

    const res = await request(app)
      .get("/api/customers/profile")
      .set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.phoneNumber).toBe("+919876543210");
    expect(Array.isArray(res.body.data.addresses)).toBe(true);
  });

  it("PUT /api/customers/profile updates name and address in a single request", async () => {
    const { cookies } = await loginWithPhone("+919876543210");

    const updatePayload = {
      name: "Adnan Shakir",
      address: {
        line1: "123 Tech Park",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
        country: "India",
      },
    };

    const updateRes = await request(app)
      .put("/api/customers/profile")
      .set("Cookie", cookies)
      .send(updatePayload);

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.name).toBe("Adnan Shakir");
    expect(updateRes.body.data.addresses.length).toBe(1);
    expect(updateRes.body.data.addresses[0].line1).toBe("123 Tech Park");
    expect(updateRes.body.data.addresses[0].city).toBe("Bengaluru");

    // Fetch profile again to confirm persistence
    const getRes = await request(app)
      .get("/api/customers/profile")
      .set("Cookie", cookies);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.name).toBe("Adnan Shakir");
    expect(getRes.body.data.addresses[0].line1).toBe("123 Tech Park");
  });

  it("PUT /api/customers/profile rejects direct unverified email updates", async () => {
    const { cookies } = await loginWithPhone("+919876543210");

    const updateRes = await request(app)
      .put("/api/customers/profile")
      .set("Cookie", cookies)
      .send({ email: "adnan@example.com" });

    expect(updateRes.status).toBe(400);
    expect(updateRes.body.success).toBe(false);
    expect(updateRes.body.message).toContain("Email updates require the verified email-change flow");
  });
});
