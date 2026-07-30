import request from "supertest";
import app from "../app.js";
import User from "../models/user.model.js";
import Category from "../models/category.model.js";
import { connectTestDB, closeTestDB, clearTestDB } from "./setup.js";

let adminToken;

beforeAll(async () => {
  await connectTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

beforeEach(async () => {
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
});

describe("POST /api/categories", () => {
  it("creates a top-level category", async () => {
    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Clothing" });

    expect(res.status).toBe(201);
    expect(res.body.data.parent).toBeNull();
  });

  it("creates a nested category with a valid parent", async () => {
    const parent = await Category.create({ name: "Clothing", slug: "clothing" });

    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "T-Shirts", parent: parent._id.toString() });

    expect(res.status).toBe(201);
    expect(res.body.data.parent).toBe(parent._id.toString());
  });

  it("rejects a non-existent parent id", async () => {
    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "T-Shirts", parent: "64b000000000000000000000" });

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/categories/:id", () => {
  it("blocks deletion when the category has children", async () => {
    const parent = await Category.create({ name: "Clothing", slug: "clothing" });
    await Category.create({ name: "T-Shirts", slug: "t-shirts", parent: parent._id });

    const res = await request(app)
      .delete(`/api/categories/${parent._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });
});