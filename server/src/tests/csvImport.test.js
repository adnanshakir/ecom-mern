import request from "supertest";
import app from "../app.js";
import User from "../models/user.model.js";
import Category from "../models/category.model.js";
import Brand from "../models/brand.model.js";
import Product from "../models/product.model.js";
import ImportJob from "../models/importJob.model.js";
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
  await User.create({ name: "Admin", email: "admin@test.com", password: "Test1234!", role: "admin" });

  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@test.com", password: "Test1234!" });

  adminToken = loginRes.body.data.accessToken;
});

const validCsv = `Title,URL handle,Description,Vendor,Product category,SKU,Barcode,Option1 name,Option1 value,Price,Compare-at price,Inventory quantity,Weight value (grams),SEO title,SEO description
Red Cap,red-cap,A nice cap,Nike,Apparel > Headwear,CAP-RED-001,111,Color,Red,499,,20,150,Red Cap - Nike,Buy a red cap
`;

const missingColumnsCsv = `Name,Handle,Cost
Something,something,10
`;

const invalidRowCsv = `Title,URL handle,Description,Vendor,Product category,SKU,Barcode,Option1 name,Option1 value,Price,Compare-at price,Inventory quantity,Weight value (grams),SEO title,SEO description
Bad Product,bad-product,No price here,Nike,Apparel > Headwear,,111,Color,Red,,,,150,,
`;

describe("POST /api/products/import/preview", () => {
  it("groups rows and returns a valid product", async () => {
    const res = await request(app)
      .post("/api/products/import/preview")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from(validCsv), "test.csv");

    expect(res.status).toBe(200);
    expect(res.body.data.totalProducts).toBe(1);
    expect(res.body.data.validCount).toBe(1);
    expect(res.body.data.products[0].variants).toHaveLength(1);
    expect(res.body.data.products[0].valid).toBe(true);
  });

  it("rejects a CSV missing required columns", async () => {
    const res = await request(app)
      .post("/api/products/import/preview")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from(missingColumnsCsv), "test.csv");

    expect(res.status).toBe(400);
  });

  it("flags a row with missing SKU/Price as invalid, not the whole request", async () => {
    const res = await request(app)
      .post("/api/products/import/preview")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from(invalidRowCsv), "test.csv");

    expect(res.status).toBe(200);
    expect(res.body.data.products[0].valid).toBe(false);
    expect(res.body.data.invalidCount).toBe(1);
  });

  it("rejects with no file attached", async () => {
    const res = await request(app)
      .post("/api/products/import/preview")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });
});

describe("POST /api/products/import/confirm", () => {
  it("imports valid products, creating category/brand that didn't exist", async () => {
    const previewRes = await request(app)
      .post("/api/products/import/preview")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from(validCsv), "test.csv");

    const confirmRes = await request(app)
      .post("/api/products/import/confirm")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ fileName: "test.csv", products: previewRes.body.data.products });

    expect(confirmRes.status).toBe(201);
    expect(confirmRes.body.data.successCount).toBe(1);

    const products = await Product.find();
    expect(products).toHaveLength(1);
    expect(products[0].status).toBe("draft");

    const brand = await Brand.findOne({ name: "Nike" });
    expect(brand).not.toBeNull();
  });

  it("skips rows marked invalid instead of importing them", async () => {
    const previewRes = await request(app)
      .post("/api/products/import/preview")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from(invalidRowCsv), "test.csv");

    const confirmRes = await request(app)
      .post("/api/products/import/confirm")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ fileName: "test.csv", products: previewRes.body.data.products });

    expect(confirmRes.body.data.successCount).toBe(0);
    expect(confirmRes.body.data.skippedCount).toBe(1);

    const products = await Product.find();
    expect(products).toHaveLength(0);
  });

  it("reuses an existing brand/category instead of duplicating", async () => {
    await Category.create({ name: "Apparel", slug: "apparel" });
    const apparel = await Category.findOne({ slug: "apparel" });
    await Category.create({ name: "Headwear", slug: "headwear", parent: apparel._id });
    await Brand.create({ name: "Nike", slug: "nike" });

    const previewRes = await request(app)
      .post("/api/products/import/preview")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from(validCsv), "test.csv");

    expect(previewRes.body.data.products[0].product.brandResolved).toBe(true);
    expect(previewRes.body.data.products[0].product.categoryResolved).toBe(true);

    await request(app)
      .post("/api/products/import/confirm")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ fileName: "test.csv", products: previewRes.body.data.products });

    const brands = await Brand.find({ name: "Nike" });
    expect(brands).toHaveLength(1); // not duplicated
  });
});

describe("POST /api/products/import/:id/rollback", () => {
  it("removes everything a completed import created", async () => {
    const previewRes = await request(app)
      .post("/api/products/import/preview")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from(validCsv), "test.csv");

    const confirmRes = await request(app)
      .post("/api/products/import/confirm")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ fileName: "test.csv", products: previewRes.body.data.products });

    const importJobId = confirmRes.body.data.importJobId;

    const rollbackRes = await request(app)
      .post(`/api/products/import/${importJobId}/rollback`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(rollbackRes.status).toBe(200);

    const products = await Product.find();
    expect(products).toHaveLength(0);

    const job = await ImportJob.findById(importJobId);
    expect(job.status).toBe("rolled_back");
  });

  it("rejects rolling back an already-rolled-back import", async () => {
    const previewRes = await request(app)
      .post("/api/products/import/preview")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from(validCsv), "test.csv");

    const confirmRes = await request(app)
      .post("/api/products/import/confirm")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ fileName: "test.csv", products: previewRes.body.data.products });

    const importJobId = confirmRes.body.data.importJobId;

    await request(app)
      .post(`/api/products/import/${importJobId}/rollback`)
      .set("Authorization", `Bearer ${adminToken}`);

    const secondAttempt = await request(app)
      .post(`/api/products/import/${importJobId}/rollback`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(secondAttempt.status).toBe(400);
  });
});