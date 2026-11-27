import { jest } from "@jest/globals";
import { createNotificationTestMocks } from "./_helpers.js";

await import("../../config/config.js");
delete process.env.FIREBASE_SERVICE_ACCOUNT_B64;
delete process.env.ENABLE_PUSH_STUB;

const mockCtrl = createNotificationTestMocks();

const {
  fill,
  buildMessage,
  pushImage,
  resolveAutoImage,
  resolveOrderItemImage,
  isRetryableFcmError,
  isInvalidOrUnregisteredTokenError,
  pushStubEnabled,
} = await import("../../services/notificationService.js");
const { default: Category } = await import("../../models/admin/category.model.js");
const { default: Brand } = await import("../../models/admin/brand.model.js");
const { default: Product } = await import("../../models/admin/product.model.js");
const { default: ProductVariant } = await import("../../models/admin/productVariant.model.js");
const { connectTestDB, closeTestDB, clearTestDB } = await import("../setup.js");

beforeAll(async () => {
  await connectTestDB();
}, 30000);

beforeEach(async () => {
  mockCtrl.reset();
  await clearTestDB();
  process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/test";
  process.env.NODE_ENV = "test";
  delete process.env.ENABLE_PUSH_STUB;
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(async () => {
  await closeTestDB();
});

describe("fill()", () => {
  it("replaces placeholders and converts missing keys to empty string", () => {
    expect(
      fill("Hi {{name}}, {{product}} is ₹{{price}}", {
        name: "Aisha",
        product: "Jacket",
        price: 999,
      })
    ).toBe("Hi Aisha, Jacket is ₹999");
    expect(fill("Hi {{name}}, {{missing}}", { name: "Aisha" })).toBe("Hi Aisha, ");
    expect(fill(undefined, { name: "Aisha" })).toBe("");
  });
});

describe("buildMessage()", () => {
  it("omits body when empty, keeps all data values as strings, sets android/apns fields, and preserves emoji title", () => {
    const msg = buildMessage({
      title: "🔥 Flash Sale!",
      body: "",
      link: "/product/denim-jacket",
      imageUrl: "https://ik.imagekit.io/test/jacket.jpg",
    });

    expect(msg).toEqual({
      notification: {
        title: "🔥 Flash Sale!",
        imageUrl: "https://ik.imagekit.io/test/jacket.jpg",
      },
      data: {
        link: "/product/denim-jacket",
        imageUrl: "https://ik.imagekit.io/test/jacket.jpg",
      },
      android: {
        priority: "high",
        notification: {
          channelId: "fibio_default",
          sound: "default",
          imageUrl: "https://ik.imagekit.io/test/jacket.jpg",
        },
      },
      apns: {
        payload: { aps: { sound: "default", mutableContent: true } },
        fcmOptions: { imageUrl: "https://ik.imagekit.io/test/jacket.jpg" },
      },
    });
    expect(Object.prototype.hasOwnProperty.call(msg.notification, "body")).toBe(false);
    for (const v of Object.values(msg.data)) {
      expect(typeof v).toBe("string");
    }
  });

  it("includes body when non-empty and drops non-https imageUrl across notification, data, android, and apns", () => {
    const msg = buildMessage({
      title: "Order Shipped",
      body: "On the way",
      link: 123,
      imageUrl: "http://example.com/insecure.jpg",
    });

    expect(msg).toEqual({
      notification: {
        title: "Order Shipped",
        body: "On the way",
      },
      data: {
        link: "123",
        imageUrl: "",
      },
      android: {
        priority: "high",
        notification: {
          channelId: "fibio_default",
          sound: "default",
        },
      },
      apns: {
        payload: { aps: { sound: "default", mutableContent: true } },
      },
    });
    expect(Object.prototype.hasOwnProperty.call(msg.notification, "imageUrl")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(msg.android.notification, "imageUrl")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(msg.apns, "fcmOptions")).toBe(false);
  });
});

describe("pushImage()", () => {
  it("appends resize params with ? or & for ImageKit URLs only", () => {
    expect(pushImage("https://ik.imagekit.io/test/shirt.jpg")).toBe(
      "https://ik.imagekit.io/test/shirt.jpg?tr=w-800,h-400,fo-auto,q-70"
    );
    expect(pushImage("https://ik.imagekit.io/test/shirt.jpg?v=2")).toBe(
      "https://ik.imagekit.io/test/shirt.jpg?v=2&tr=w-800,h-400,fo-auto,q-70"
    );
  });

  it("passes non-ImageKit https URLs unchanged and returns empty string for http or empty inputs", () => {
    expect(pushImage("https://cdn.example.com/photo.png")).toBe(
      "https://cdn.example.com/photo.png"
    );
    expect(pushImage("http://ik.imagekit.io/test/shirt.jpg")).toBe("");
    expect(pushImage("")).toBe("");
    expect(pushImage("   ")).toBe("");
    expect(pushImage(null)).toBe("");
  });
});

describe("resolveAutoImage()", () => {
  it("resolves product image, variant fallback, inactive/unknown product, category own image, category tree fallback, non-target links, and DB errors", async () => {
    const brand = await Brand.create({ name: "Fibio", slug: "fibio" });
    const parentCat = await Category.create({
      name: "Apparel",
      slug: "apparel",
      image: { url: "https://ik.imagekit.io/test/cat-apparel.jpg" },
    });
    const noImgCat = await Category.create({
      name: "Footwear",
      slug: "footwear",
    });
    const childCat = await Category.create({
      name: "Sneakers",
      slug: "sneakers",
      parent: noImgCat._id,
    });

    const prodWithImg = await Product.create({
      name: "Denim Jacket",
      slug: "denim-jacket",
      category: parentCat._id,
      brand: brand._id,
      status: "active",
      images: [{ url: "https://ik.imagekit.io/test/jacket.jpg" }],
    });
    await ProductVariant.create({
      product: prodWithImg._id,
      sku: "DJ-1",
      price: 1000,
      stock: 5,
    });

    const prodVarImgOnly = await Product.create({
      name: "White Tee",
      slug: "white-tee",
      category: parentCat._id,
      brand: brand._id,
      status: "active",
      images: [],
    });
    await ProductVariant.create({
      product: prodVarImgOnly._id,
      sku: "WT-1",
      price: 500,
      stock: 5,
      images: [{ url: "https://ik.imagekit.io/test/tee-var.jpg" }],
    });

    const inactiveProd = await Product.create({
      name: "Draft Coat",
      slug: "draft-coat",
      category: parentCat._id,
      brand: brand._id,
      status: "draft",
      images: [{ url: "https://ik.imagekit.io/test/draft.jpg" }],
    });
    await ProductVariant.create({ product: inactiveProd._id, sku: "DC-1", price: 500, stock: 5 });

    // Two active products in childCat; best-stocked one should win for /category/footwear
    const lowStockShoe = await Product.create({
      name: "Low Stock Shoe",
      slug: "low-stock-shoe",
      category: childCat._id,
      brand: brand._id,
      status: "active",
      images: [{ url: "https://ik.imagekit.io/test/low-shoe.jpg" }],
    });
    await ProductVariant.create({ product: lowStockShoe._id, sku: "LS-1", price: 900, stock: 3 });

    const highStockShoe = await Product.create({
      name: "High Stock Shoe",
      slug: "high-stock-shoe",
      category: childCat._id,
      brand: brand._id,
      status: "active",
      images: [{ url: "https://ik.imagekit.io/test/high-shoe.jpg" }],
    });
    await ProductVariant.create({ product: highStockShoe._id, sku: "HS-1", price: 900, stock: 25 });

    expect(await resolveAutoImage("/product/denim-jacket")).toBe(
      "https://ik.imagekit.io/test/jacket.jpg"
    );
    expect(await resolveAutoImage("/product/white-tee")).toBe(
      "https://ik.imagekit.io/test/tee-var.jpg"
    );
    expect(await resolveAutoImage("/product/draft-coat")).toBe("");
    expect(await resolveAutoImage("/product/does-not-exist")).toBe("");

    expect(await resolveAutoImage("/category/apparel")).toBe(
      "https://ik.imagekit.io/test/cat-apparel.jpg"
    );
    expect(await resolveAutoImage("/category/footwear")).toBe(
      "https://ik.imagekit.io/test/high-shoe.jpg"
    );
    expect(await resolveAutoImage("/category/unknown-cat")).toBe("");

    expect(await resolveAutoImage("/")).toBe("");
    expect(await resolveAutoImage("/orders")).toBe("");
    expect(await resolveAutoImage("/cart")).toBe("");
    expect(await resolveAutoImage("https://example.com/promo")).toBe("");
    expect(await resolveAutoImage("not-a-valid-link-%E0%A4%A")).toBe("");
    expect(await resolveAutoImage(null)).toBe("");

    jest.spyOn(Product, "findOne").mockImplementationOnce(() => {
      throw new Error("DB connection lost");
    });
    expect(await resolveAutoImage("/product/denim-jacket")).toBe("");
  });

  it("resolveOrderItemImage resolves order item image, variant fallback, product fallback, and empty/error safely", async () => {
    const brand = await Brand.create({ name: "B", slug: "b" });
    const cat = await Category.create({ name: "C", slug: "c" });
    const prodImg = await Product.create({
      name: "P1",
      slug: "p1",
      category: cat._id,
      brand: brand._id,
      status: "active",
      images: [{ url: "https://ik.imagekit.io/test/p1.jpg" }],
    });
    const varNoImg = await ProductVariant.create({
      product: prodImg._id,
      sku: "V1",
      price: 100,
      stock: 5,
    });

    const prodNoImg = await Product.create({
      name: "P2",
      slug: "p2",
      category: cat._id,
      brand: brand._id,
      status: "active",
      images: [],
    });
    const varWithImg = await ProductVariant.create({
      product: prodNoImg._id,
      sku: "V2",
      price: 100,
      stock: 5,
      images: [{ url: "https://ik.imagekit.io/test/v2.jpg" }],
    });

    expect(
      await resolveOrderItemImage({ items: [{ image: "https://ik.imagekit.io/test/direct.jpg" }] })
    ).toBe("https://ik.imagekit.io/test/direct.jpg");
    expect(await resolveOrderItemImage({ items: [{ variantId: varWithImg._id }] })).toBe(
      "https://ik.imagekit.io/test/v2.jpg"
    );
    expect(
      await resolveOrderItemImage({ items: [{ variantId: varNoImg._id, product: prodImg._id }] })
    ).toBe("https://ik.imagekit.io/test/p1.jpg");
    expect(await resolveOrderItemImage({ items: [{ product: prodNoImg._id }] })).toBe(
      "https://ik.imagekit.io/test/v2.jpg"
    );
    expect(await resolveOrderItemImage({ items: [] })).toBe("");
    expect(await resolveOrderItemImage(null)).toBe("");

    jest.spyOn(ProductVariant, "findById").mockImplementationOnce(() => {
      throw new Error("DB fail");
    });
    expect(await resolveOrderItemImage({ items: [{ variantId: varWithImg._id }] })).toBe("");
  });
});

describe("FCM error classifiers", () => {
  it("classifies invalid/unregistered tokens vs retryable vs non-retryable and never deletes on invalid-argument", () => {
    expect(
      isInvalidOrUnregisteredTokenError({ code: "messaging/registration-token-not-registered" })
    ).toBe(true);
    expect(
      isInvalidOrUnregisteredTokenError({ code: "messaging/invalid-registration-token" })
    ).toBe(true);
    expect(isInvalidOrUnregisteredTokenError({ code: "messaging/invalid-argument" })).toBe(false);
    expect(isInvalidOrUnregisteredTokenError({ code: "messaging/server-unavailable" })).toBe(false);
    expect(isInvalidOrUnregisteredTokenError(null)).toBe(false);

    expect(isRetryableFcmError({ code: "messaging/server-unavailable" })).toBe(true);
    expect(isRetryableFcmError({ code: "messaging/internal-error" })).toBe(true);
    expect(isRetryableFcmError({ code: "messaging/quota-exceeded" })).toBe(true);
    expect(isRetryableFcmError({ code: "messaging/device-message-rate-exceeded" })).toBe(true);
    expect(isRetryableFcmError({ code: "messaging/unavailable" })).toBe(true);
    expect(isRetryableFcmError({ code: "messaging/invalid-argument" })).toBe(false);
    expect(isRetryableFcmError({ code: "messaging/sender-id-mismatch" })).toBe(false);
    expect(isRetryableFcmError(null)).toBe(false);
  });
});

describe("Stub flag (pushStubEnabled)", () => {
  it("enables stub only when ENABLE_PUSH_STUB=true and NODE_ENV is not production", () => {
    process.env.NODE_ENV = "test";
    process.env.ENABLE_PUSH_STUB = "true";
    expect(pushStubEnabled()).toBe(true);

    process.env.NODE_ENV = "development";
    expect(pushStubEnabled()).toBe(true);

    process.env.NODE_ENV = "production";
    expect(pushStubEnabled()).toBe(false);

    process.env.NODE_ENV = "test";
    process.env.ENABLE_PUSH_STUB = "false";
    expect(pushStubEnabled()).toBe(false);

    delete process.env.ENABLE_PUSH_STUB;
    expect(pushStubEnabled()).toBe(false);
  });
});
