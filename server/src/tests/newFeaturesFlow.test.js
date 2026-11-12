import request from "supertest";
import mongoose from "mongoose";
import app from "../app.js";
import User from "../models/admin/user.model.js";
import Category from "../models/admin/category.model.js";
import Brand from "../models/admin/brand.model.js";
import Product from "../models/admin/product.model.js";
import ProductVariant from "../models/admin/productVariant.model.js";
import Cart from "../models/customer/cart.model.js";
import Wishlist from "../models/customer/wishlist.model.js";
import { connectTestDB, closeTestDB, clearTestDB } from "./setup.js";
import { createCustomerAuth } from "../config/customerAuth.js";

let adminToken;
let customerCookies;
let categoryId;
let brandId;
let variantId;
let lowStockVariantId;
let inactiveVariantId;
let activeProductId;
let archivedProductId;

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

beforeEach(async () => {
  // 1. Admin login
  await User.create({
    name: "Admin",
    email: "admin@test.com",
    password: "Test1234!",
    role: "admin",
  });

  const adminLogin = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@test.com", password: "Test1234!" });
  adminToken = adminLogin.body.data.accessToken;

  // 2. Customer login
  await request(app)
    .post("/api/v1/customers/auth/phone-number/send-otp")
    .set("Origin", "http://localhost:3000")
    .send({ phoneNumber: "+919876543210" });

  const db = mongoose.connection.db;
  const doc = await db.collection("customerVerification").findOne({ identifier: "+919876543210" });
  const code = doc?.value?.split(":")[0];

  const verifyRes = await request(app)
    .post("/api/v1/customers/auth/phone-number/verify")
    .set("Origin", "http://localhost:3000")
    .send({ phoneNumber: "+919876543210", code });

  customerCookies = verifyRes.headers["set-cookie"];

  // 3. Baseline products and variants
  const cat = await Category.create({ name: "Electronics", slug: "electronics" });
  const brand = await Brand.create({ name: "Sony", slug: "sony" });
  categoryId = cat._id.toString();
  brandId = brand._id.toString();

  const prod = await Product.create({
    name: "Wireless Headphones",
    slug: "wireless-headphones",
    description: "High quality wireless headphones with active noise cancellation.",
    keyFeatures: "• ANC\n• 40h Battery",
    productDimensions: "20 x 18 x 8 cm, 250g",
    category: cat._id,
    brand: brand._id,
    status: "active",
  });
  activeProductId = prod._id.toString();

  const v1 = await ProductVariant.create({
    product: prod._id,
    sku: "SONY-WH-001",
    price: 1999,
    stock: 20,
    isActive: true,
  });
  variantId = v1._id.toString();

  const v2 = await ProductVariant.create({
    product: prod._id,
    sku: "SONY-WH-002",
    price: 2499,
    stock: 5,
    isActive: true,
  });
  lowStockVariantId = v2._id.toString();

  const v3 = await ProductVariant.create({
    product: prod._id,
    sku: "SONY-WH-INACTIVE",
    price: 999,
    stock: 10,
    isActive: false,
  });
  inactiveVariantId = v3._id.toString();

  const archivedProd = await Product.create({
    name: "Archived TV",
    slug: "archived-tv",
    description: "Old model",
    category: cat._id,
    brand: brand._id,
    status: "archived",
  });
  archivedProductId = archivedProd._id.toString();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. PUBLIC CATEGORIES API & EMPTY STATES
// ─────────────────────────────────────────────────────────────────────────────

describe("Categories API — Single Route & Empty State Handling", () => {
  it("removes the duplicate /categories/tree route and returns 404", async () => {
    const res = await request(app).get("/api/public/categories/tree");
    expect(res.status).toBe(404);
  });

  it("GET /api/public/categories returns parent categories with populated subcategories and subcategory images", async () => {
    const parentCat = await Category.create({
      name: "Fashion",
      slug: "fashion",
      image: { url: "https://ik.imagekit.io/test/fashion.jpg", fileId: "fashion_1" },
      isActive: true,
    });

    await Category.create({
      name: "Men T-Shirts",
      slug: "men-t-shirts",
      parent: parentCat._id,
      image: { url: "https://ik.imagekit.io/test/tshirts.jpg", fileId: "tshirts_1" },
      isActive: true,
    });

    const res = await request(app).get("/api/public/categories");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const fashion = res.body.data.find((c) => c.slug === "fashion");
    expect(fashion).toBeDefined();
    expect(fashion.image.url).toBe("https://ik.imagekit.io/test/fashion.jpg");
    expect(Array.isArray(fashion.subcategories)).toBe(true);
    expect(fashion.subcategories).toHaveLength(1);

    const sub = fashion.subcategories[0];
    expect(sub.name).toBe("Men T-Shirts");
    expect(sub.slug).toBe("men-t-shirts");
    expect(sub.image.url).toBe("https://ik.imagekit.io/test/tshirts.jpg");
  });

  it("handles empty subcategories state cleanly: categories without children have subcategories: []", async () => {
    const res = await request(app).get("/api/public/categories");
    expect(res.status).toBe(200);

    const electronics = res.body.data.find((c) => c.slug === "electronics");
    expect(electronics).toBeDefined();
    expect(electronics.subcategories).toEqual([]);
    expect(electronics.children).toBeUndefined();
  });

  it("does not accept removed price_asc or price_desc sort options on GET /api/public/products", async () => {
    const ascRes = await request(app).get("/api/public/products?sort=price_asc");
    expect(ascRes.status).toBe(400);

    const descRes = await request(app).get("/api/public/products?sort=price_desc");
    expect(descRes.status).toBe(400);

    const featuredRes = await request(app).get("/api/public/products?sort=featured");
    expect(featuredRes.status).toBe(200);

    const newestRes = await request(app).get("/api/public/products?sort=newest");
    expect(newestRes.status).toBe(200);
  });

  it("handles missing image empty state cleanly: categories/subcategories without images return image.url = ''", async () => {
    const parent = await Category.create({ name: "Books", slug: "books", isActive: true });
    await Category.create({ name: "Fiction", slug: "fiction", parent: parent._id, isActive: true });

    const res = await request(app).get("/api/public/categories");
    expect(res.status).toBe(200);

    const books = res.body.data.find((c) => c.slug === "books");
    expect(books).toBeDefined();
    expect(books.image).toEqual({ url: "" });
    expect(books.subcategories[0].image).toEqual({ url: "" });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. PRODUCT DESCRIPTION LENGTH & DETAIL BUCKETS
// ─────────────────────────────────────────────────────────────────────────────

describe("Product Description & Detail Modules", () => {
  it("rejects product creation when description is missing/empty", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Invalid Product",
        description: "",
        category: categoryId,
        brand: brandId,
        variants: [{ sku: "INV-001", price: 100, stock: 10 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects product creation when description exceeds 500 words", async () => {
    const longDesc = new Array(501).fill("word").join(" ");

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Wordy Product",
        description: longDesc,
        category: categoryId,
        brand: brandId,
        variants: [{ sku: "WORD-001", price: 100, stock: 10 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot exceed 500 words/i);
  });

  it("successfully creates product with up to 500 words description and extra detail buckets", async () => {
    const validDesc = new Array(480).fill("quality").join(" ");

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Pro Headphones",
        description: validDesc,
        keyFeatures: "• Studio Monitor Quality\n• Detachable Cable\n• Gold Plated Jack",
        productDimensions: "25 x 20 x 10 cm, 380g",
        category: categoryId,
        brand: brandId,
        variants: [{ sku: "PRO-001", price: 4999, stock: 15 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Pro Headphones");
    expect(res.body.data.keyFeatures).toBe(
      "• Studio Monitor Quality\n• Detachable Cable\n• Gold Plated Jack"
    );
    expect(res.body.data.productDimensions).toBe("25 x 20 x 10 cm, 380g");
  });

  it("allows keyFeatures and productDimensions to be empty / omitted without errors", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Basic Product",
        description: "A simple product with only mandatory description.",
        category: categoryId,
        brand: brandId,
        variants: [{ sku: "BSC-001", price: 50, stock: 5 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.keyFeatures).toBe("");
    expect(res.body.data.productDimensions).toBe("");
  });

  it("public product detail endpoint returns keyFeatures and productDimensions", async () => {
    const res = await request(app).get("/api/public/products/wireless-headphones");

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Wireless Headphones");
    expect(res.body.data.keyFeatures).toBe("• ANC\n• 40h Battery");
    expect(res.body.data.productDimensions).toBe("20 x 18 x 8 cm, 250g");
  });

  it("partial product update preserves existing keyFeatures and productDimensions when omitted", async () => {
    const res = await request(app)
      .put(`/api/products/${activeProductId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Wireless Headphones Pro" });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Wireless Headphones Pro");
    expect(res.body.data.keyFeatures).toBe("• ANC\n• 40h Battery");
    expect(res.body.data.productDimensions).toBe("20 x 18 x 8 cm, 250g");

    const persisted = await Product.findById(activeProductId);
    expect(persisted.keyFeatures).toBe("• ANC\n• 40h Battery");
    expect(persisted.productDimensions).toBe("20 x 18 x 8 cm, 250g");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. GUEST CART MERGE FLOW & LOOPHOLES
// ─────────────────────────────────────────────────────────────────────────────

describe("Guest Cart Merge Flow & Loophole Probing", () => {
  it("rejects merge request if not authenticated (401)", async () => {
    const res = await request(app)
      .post("/api/customers/cart/merge")
      .send({ items: [{ variantId, quantity: 1 }] });

    expect(res.status).toBe(401);
  });

  it("successfully merges guest cart items into a newly created user cart", async () => {
    const res = await request(app)
      .post("/api/customers/cart/merge")
      .set("Cookie", customerCookies)
      .send({
        items: [
          { variantId, quantity: 2 },
          { variantId: lowStockVariantId, quantity: 1 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(2);

    const item1 = res.body.data.items.find((i) => i.variant._id.toString() === variantId);
    expect(item1.quantity).toBe(2);

    const item2 = res.body.data.items.find((i) => i.variant._id.toString() === lowStockVariantId);
    expect(item2.quantity).toBe(1);
  });

  it("merges and adds quantities when variant already exists in customer cart", async () => {
    // 1. Add 3 to customer cart first
    await request(app)
      .post("/api/customers/cart/items")
      .set("Cookie", customerCookies)
      .send({ variantId, quantity: 3 });

    // 2. Merge 2 from guest cart
    const res = await request(app)
      .post("/api/customers/cart/merge")
      .set("Cookie", customerCookies)
      .send({ items: [{ variantId, quantity: 2 }] });

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].quantity).toBe(5);
  });

  it("LOOPHOLE: clamps merged quantity to available variant stock if requested quantity exceeds stock", async () => {
    // lowStockVariantId has stock = 5
    const res = await request(app)
      .post("/api/customers/cart/merge")
      .set("Cookie", customerCookies)
      .send({ items: [{ variantId: lowStockVariantId, quantity: 999 }] });

    expect(res.status).toBe(200);
    const item = res.body.data.items.find((i) => i.variant._id.toString() === lowStockVariantId);
    expect(item.quantity).toBe(5); // Must not allow 999!
  });

  it("LOOPHOLE: clamps combined existing + guest quantity if sum exceeds available stock", async () => {
    // lowStockVariantId has stock = 5
    // Add 4 first
    await request(app)
      .post("/api/customers/cart/items")
      .set("Cookie", customerCookies)
      .send({ variantId: lowStockVariantId, quantity: 4 });

    // Merge 3 (total would be 7)
    const res = await request(app)
      .post("/api/customers/cart/merge")
      .set("Cookie", customerCookies)
      .send({ items: [{ variantId: lowStockVariantId, quantity: 3 }] });

    expect(res.status).toBe(200);
    const item = res.body.data.items.find((i) => i.variant._id.toString() === lowStockVariantId);
    expect(item.quantity).toBe(5); // Clamped to 5
  });

  it("LOOPHOLE: safely ignores inactive or non-existent variant IDs from stale localStorage without failing the batch and reports skippedItems", async () => {
    const fakeVariantId = new mongoose.Types.ObjectId().toString();
    const outOfStockVariant = await ProductVariant.create({
      product: activeProductId,
      sku: "SONY-WH-OOS",
      price: 1999,
      stock: 0,
      isActive: true,
    });

    const res = await request(app)
      .post("/api/customers/cart/merge")
      .set("Cookie", customerCookies)
      .send({
        items: [
          { variantId, quantity: 2 }, // valid
          { variantId: fakeVariantId, quantity: 5 }, // non-existent
          { variantId: inactiveVariantId, quantity: 3 }, // inactive variant
          { variantId: outOfStockVariant._id.toString(), quantity: 1 }, // out of stock
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].variant._id.toString()).toBe(variantId);
    expect(res.body.data.skippedItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          variantId: fakeVariantId,
          reason: "not_found",
          requestedQuantity: 5,
        }),
        expect.objectContaining({
          variantId: inactiveVariantId,
          reason: "inactive",
          requestedQuantity: 3,
        }),
        expect.objectContaining({
          variantId: outOfStockVariant._id.toString(),
          reason: "out_of_stock",
          requestedQuantity: 1,
        }),
      ])
    );
    expect(res.body.data.skippedItems).toHaveLength(3);
  });

  it("LOOPHOLE: deduplicates retried and concurrent cart merge requests using the same batchId", async () => {
    const batchId = "retry-batch-001";
    const fakeVariantId = new mongoose.Types.ObjectId().toString();

    const [r1, r2] = await Promise.all([
      request(app)
        .post("/api/customers/cart/merge")
        .set("Cookie", customerCookies)
        .send({
          batchId,
          items: [
            { variantId, quantity: 2 },
            { variantId: fakeVariantId, quantity: 1 },
          ],
        }),
      request(app)
        .post("/api/customers/cart/merge")
        .set("Cookie", customerCookies)
        .send({
          batchId,
          items: [
            { variantId, quantity: 2 },
            { variantId: fakeVariantId, quantity: 1 },
          ],
        }),
    ]);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);

    // Sequential retry with same batchId also must not double-increment quantities
    const r3 = await request(app)
      .post("/api/customers/cart/merge")
      .set("Cookie", customerCookies)
      .send({
        batchId,
        items: [
          { variantId, quantity: 2 },
          { variantId: fakeVariantId, quantity: 1 },
        ],
      });

    expect(r3.status).toBe(200);
    expect(r3.body.data.items).toHaveLength(1);
    expect(r3.body.data.items[0].quantity).toBe(2);
    expect(r3.body.data.skippedItems).toEqual([
      expect.objectContaining({ variantId: fakeVariantId, reason: "not_found" }),
    ]);

    // A genuinely new batchId DOES increment quantities normally
    const r4 = await request(app)
      .post("/api/customers/cart/merge")
      .set("Cookie", customerCookies)
      .send({
        batchId: "retry-batch-002",
        items: [{ variantId, quantity: 1 }],
      });
    expect(r4.status).toBe(200);
    expect(r4.body.data.items[0].quantity).toBe(3);
  });

  it("rejects cart merge payloads exceeding the maximum item limit (Zod validation)", async () => {
    const oversizedItems = Array.from({ length: 101 }, () => ({ variantId, quantity: 1 }));
    const res = await request(app)
      .post("/api/customers/cart/merge")
      .set("Cookie", customerCookies)
      .send({ items: oversizedItems });

    expect(res.status).toBe(400);
  });

  it("rejects invalid payload with negative or non-numeric quantity (Zod validation)", async () => {
    const res = await request(app)
      .post("/api/customers/cart/merge")
      .set("Cookie", customerCookies)
      .send({ items: [{ variantId, quantity: -5 }] });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. GUEST WISHLIST MERGE FLOW & LOOPHOLES
// ─────────────────────────────────────────────────────────────────────────────

describe("Guest Wishlist Merge Flow & Loophole Probing", () => {
  it("rejects merge request if not authenticated (401)", async () => {
    const res = await request(app)
      .post("/api/customers/wishlist/merge")
      .send({ productIds: [activeProductId] });

    expect(res.status).toBe(401);
  });

  it("successfully merges guest product IDs into user wishlist", async () => {
    const res = await request(app)
      .post("/api/customers/wishlist/merge")
      .set("Cookie", customerCookies)
      .send({ productIds: [activeProductId] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.products).toHaveLength(1);
    expect(res.body.data.products[0]._id.toString()).toBe(activeProductId);
  });

  it("LOOPHOLE: ensures deduplication so products already in user wishlist are not duplicated", async () => {
    // 1. Add activeProductId to wishlist directly
    await request(app)
      .post("/api/customers/wishlist/items")
      .set("Cookie", customerCookies)
      .send({ productId: activeProductId });

    // 2. Merge the same activeProductId multiple times in payload
    const res = await request(app)
      .post("/api/customers/wishlist/merge")
      .set("Cookie", customerCookies)
      .send({ productIds: [activeProductId, activeProductId] });

    expect(res.status).toBe(200);
    expect(res.body.data.products).toHaveLength(1);
  });

  it("LOOPHOLE: filters out archived or non-existent product IDs from stale localStorage", async () => {
    const fakeProductId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .post("/api/customers/wishlist/merge")
      .set("Cookie", customerCookies)
      .send({ productIds: [activeProductId, fakeProductId, archivedProductId] });

    expect(res.status).toBe(200);
    expect(res.body.data.products).toHaveLength(1);
    expect(res.body.data.products[0]._id.toString()).toBe(activeProductId);
  });

  it("handles empty productIds array cleanly", async () => {
    const res = await request(app)
      .post("/api/customers/wishlist/merge")
      .set("Cookie", customerCookies)
      .send({ productIds: [] });

    expect(res.status).toBe(200);
    expect(res.body.data.products).toEqual([]);
  });

  it("rejects wishlist merge payloads exceeding the maximum productIds limit (Zod validation)", async () => {
    const oversizedIds = Array.from({ length: 101 }, () => activeProductId);
    const res = await request(app)
      .post("/api/customers/wishlist/merge")
      .set("Cookie", customerCookies)
      .send({ productIds: oversizedIds });

    expect(res.status).toBe(400);
  });
});
