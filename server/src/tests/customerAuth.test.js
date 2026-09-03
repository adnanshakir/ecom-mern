import request from "supertest";
import express from "express";
import { connectTestDB, closeTestDB, clearTestDB } from "./setup.js";
import { createTestCustomerAuth, getTestCustomerAuthHandler } from "../config/customerAuth.test.config.js";

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

describe("Customer Auth - Phone Number Uniqueness Regression Tests", () => {
  it("allows registration for the first user with phone A", async () => {
    const res = await request(testApp)
      .post("/api/v1/customers/auth/sign-up/email")
      .set("Origin", "http://localhost:3000")
      .send({
        name: "User One",
        email: "user1@example.com",
        password: "Password123!",
        phoneNumber: "+15550001111",
      });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe("user1@example.com");
    expect(res.body.user.phoneNumber).toBe("+15550001111");
  });

  it("rejects registration for a second user with the same phone A (email 2)", async () => {
    // Register first user
    await request(testApp)
      .post("/api/v1/customers/auth/sign-up/email")
      .set("Origin", "http://localhost:3000")
      .send({
        name: "User One",
        email: "user1@example.com",
        password: "Password123!",
        phoneNumber: "+15550001111",
      });

    // Attempt second user with same phone number
    const res = await request(testApp)
      .post("/api/v1/customers/auth/sign-up/email")
      .set("Origin", "http://localhost:3000")
      .send({
        name: "User Two",
        email: "user2@example.com",
        password: "Password123!",
        phoneNumber: "+15550001111",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("User with this phone number already exists");
  });

  it("allows registration for a second user with phone B (different phone number)", async () => {
    // Register first user
    await request(testApp)
      .post("/api/v1/customers/auth/sign-up/email")
      .set("Origin", "http://localhost:3000")
      .send({
        name: "User One",
        email: "user1@example.com",
        password: "Password123!",
        phoneNumber: "+15550001111",
      });

    // Register second user with different phone number
    const res = await request(testApp)
      .post("/api/v1/customers/auth/sign-up/email")
      .set("Origin", "http://localhost:3000")
      .send({
        name: "User Two",
        email: "user2@example.com",
        password: "Password123!",
        phoneNumber: "+15550002222",
      });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe("user2@example.com");
    expect(res.body.user.phoneNumber).toBe("+15550002222");
  });

  it("allows multiple users without a phone number due to sparse indexing", async () => {
    const res1 = await request(testApp)
      .post("/api/v1/customers/auth/sign-up/email")
      .set("Origin", "http://localhost:3000")
      .send({
        name: "User Without Phone 1",
        email: "nophone1@example.com",
        password: "Password123!",
      });

    const res2 = await request(testApp)
      .post("/api/v1/customers/auth/sign-up/email")
      .set("Origin", "http://localhost:3000")
      .send({
        name: "User Without Phone 2",
        email: "nophone2@example.com",
        password: "Password123!",
      });

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
  });
});
