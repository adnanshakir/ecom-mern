import request from "supertest";
import { jest } from "@jest/globals";
import User from "../models/user.model.js";
import { connectTestDB, closeTestDB, clearTestDB } from "./setup.js";

// Mock the ImageKit SDK BEFORE importing app, so every controller that
// imports utils/imagekit.js gets the fake version instead of the real one
jest.unstable_mockModule("../utils/imagekit.js", () => ({
  default: {
    upload: jest.fn().mockResolvedValue({
      url: "https://ik.imagekit.io/test/mock-image.jpg",
      fileId: "mockFileId123",
      name: "mock-image.jpg",
    }),
  },
}));

// dynamic import AFTER the mock is registered — this is required in ESM
const { default: app } = await import("../app.js");

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
  await User.create({ name: "Admin", email: "admin@test.com", password: "Test1234!", role: "admin" });

  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@test.com", password: "Test1234!" });

  adminToken = loginRes.body.data.accessToken;
});

describe("POST /api/images/upload", () => {
  it("uploads an image and returns url + fileId", async () => {
    const res = await request(app)
      .post("/api/images/upload")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("image", Buffer.from("fake image content"), "test.jpg");

    expect(res.status).toBe(201);
    expect(res.body.data.url).toBe("https://ik.imagekit.io/test/mock-image.jpg");
    expect(res.body.data.fileId).toBe("mockFileId123");
  });

  it("rejects upload with no token", async () => {
    const res = await request(app)
      .post("/api/images/upload")
      .attach("image", Buffer.from("fake image content"), "test.jpg");

    expect(res.status).toBe(401);
  });

  it("rejects a non-image file type", async () => {
    const res = await request(app)
      .post("/api/images/upload")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("image", Buffer.from("not an image"), {
        filename: "test.txt",
        contentType: "text/plain",
      });

    expect(res.status).toBe(400);
  });

  it("rejects request with no file attached", async () => {
    const res = await request(app)
      .post("/api/images/upload")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });
});