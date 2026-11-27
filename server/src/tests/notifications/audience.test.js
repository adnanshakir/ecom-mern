import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { createNotificationTestMocks, useFakeClock } from "./_helpers.js";

await import("../../config/config.js");
delete process.env.FIREBASE_SERVICE_ACCOUNT_B64;
delete process.env.ENABLE_PUSH_STUB;

const mockCtrl = createNotificationTestMocks();

const { resolveAudience, countAudience } = await import("../../services/notificationAudience.js");
const { default: Category } = await import("../../models/admin/category.model.js");
const { default: Brand } = await import("../../models/admin/brand.model.js");
const { default: Product } = await import("../../models/admin/product.model.js");
const { default: ProductVariant } = await import("../../models/admin/productVariant.model.js");
const { default: CustomerProfile } = await import("../../models/customer/customer.model.js");
const { default: Cart } = await import("../../models/customer/cart.model.js");
const { default: Wishlist } = await import("../../models/customer/wishlist.model.js");
const { default: Order } = await import("../../models/customer/order.model.js");
const { default: DeviceToken } = await import("../../models/DeviceToken.js");
const { connectTestDB, closeTestDB, clearTestDB } = await import("../setup.js");

beforeAll(async () => {
  await connectTestDB();
}, 30000);

beforeEach(async () => {
  mockCtrl.reset();
  await clearTestDB();
});

afterEach(() => {
  jest.useRealTimers();
});

afterAll(async () => {
  await closeTestDB();
});

describe("notificationAudience", () => {
  it("resolves every segment accurately and excludes deleted, banned, inactive, and empty fixtures", async () => {
    const fixedNow = "2026-11-27T12:00:00.000Z";
    useFakeClock(fixedNow);
    const nowMs = Date.now();
    const dayMs = 24 * 3600 * 1000;

    const parentCat = await Category.create({ name: "Apparel", slug: "apparel" });
    const childCat = await Category.create({
      name: "Jackets",
      slug: "jackets",
      parent: parentCat._id,
    });
    const otherCat = await Category.create({ name: "Shoes", slug: "shoes" });
    const brand = await Brand.create({ name: "Fibio", slug: "fibio" });

    const jacket = await Product.create({
      name: "Denim Jacket",
      slug: "denim-jacket",
      category: childCat._id,
      brand: brand._id,
      status: "active",
      images: [{ url: "https://ik.imagekit.io/test/jacket.jpg" }],
    });
    const jacketVar = await ProductVariant.create({
      product: jacket._id,
      sku: "DJ-1",
      price: 2000,
      stock: 10,
    });

    const shoe = await Product.create({
      name: "Running Shoe",
      slug: "running-shoe",
      category: otherCat._id,
      brand: brand._id,
      status: "active",
      images: [{ url: "https://ik.imagekit.io/test/shoe.jpg" }],
    });
    const shoeVar = await ProductVariant.create({
      product: shoe._id,
      sku: "RS-1",
      price: 1500,
      stock: 10,
    });

    const db = mongoose.connection.db;
    await db.collection("customerUser").insertMany([
      { id: "u-old-cart", name: "OldCart", createdAt: new Date(nowMs - 40 * dayMs) },
      { id: "u-exact30", name: "Exact30", createdAt: new Date(nowMs - 30 * dayMs) }, // createdAt === cutoff -> excluded (>= cutoff)
      { id: "u-31d", name: "Inactive31", createdAt: new Date(nowMs - 31 * dayMs) },
      { id: "u-recent-sess", name: "RecentSess", createdAt: new Date(nowMs - 40 * dayMs) },
      { id: "u-ordered-deliv", name: "OrderedDeliv", createdAt: new Date(nowMs - 40 * dayMs) },
      { id: "u-ordered-cancel", name: "OrderedCancel", createdAt: new Date(nowMs - 40 * dayMs) },
      { id: "u-banned", name: "Banned", banned: true, createdAt: new Date(nowMs - 40 * dayMs) },
      {
        id: "u-deleted",
        name: "Deleted",
        isDeleted: true,
        createdAt: new Date(nowMs - 40 * dayMs),
      },
      { id: "u-inactive-prof", name: "InactiveProf", createdAt: new Date(nowMs - 40 * dayMs) },
    ]);

    const mkProfile = (authUserId, isActive = true, ageDays = 40) =>
      CustomerProfile.create({
        authUserId,
        isActive,
        createdAt: new Date(nowMs - ageDays * dayMs),
      });

    const pOldCart = await mkProfile("u-old-cart", true, 40);
    const pExact30 = await mkProfile("u-exact30", true, 30);
    const p31d = await mkProfile("u-31d", true, 31);
    const pRecentSess = await mkProfile("u-recent-sess", true, 40);
    const pOrderedDeliv = await mkProfile("u-ordered-deliv", true, 40);
    const pOrderedCancel = await mkProfile("u-ordered-cancel", true, 40);
    const pBanned = await mkProfile("u-banned", true, 40);
    const pDeleted = await mkProfile("u-deleted", true, 40);
    const pInactiveProf = await mkProfile("u-inactive-prof", false, 40);

    // Recent session for pRecentSess (29 days ago -> active, excluded from inactive_30d)
    await db.collection("customerSession").insertOne({
      userId: "u-recent-sess",
      updatedAt: new Date(nowMs - 29 * dayMs),
    });

    // Carts: pOldCart (jacket), pBanned (jacket), pDeleted (jacket), pInactiveProf (jacket), p31d (empty cart)
    await Cart.create({ customer: pOldCart._id, items: [{ variant: jacketVar._id, quantity: 1 }] });
    await Cart.create({ customer: pBanned._id, items: [{ variant: jacketVar._id, quantity: 1 }] });
    await Cart.create({ customer: pDeleted._id, items: [{ variant: jacketVar._id, quantity: 1 }] });
    await Cart.create({
      customer: pInactiveProf._id,
      items: [{ variant: jacketVar._id, quantity: 1 }],
    });
    await Cart.create({ customer: p31d._id, items: [] });

    // Wishlists: pOrderedDeliv (jacket), pRecentSess (shoe), pExact30 (empty)
    await Wishlist.create({ customer: pOrderedDeliv._id, products: [jacket._id] });
    await Wishlist.create({ customer: pRecentSess._id, products: [shoe._id] });
    await Wishlist.create({ customer: pExact30._id, products: [] });

    // Orders: pOrderedDeliv (delivered 5 days ago), pOrderedCancel (cancelled 35 days ago)
    await Order.create({
      orderNumber: "ORD-D1",
      customer: pOrderedDeliv._id,
      items: [
        {
          product: jacket._id,
          variantId: jacketVar._id,
          name: "Denim Jacket",
          quantity: 1,
          unitPrice: 2000,
        },
      ],
      shippingAddress: { line1: "1 St", city: "M", postalCode: "400001" },
      subtotal: 2000,
      total: 2000,
      orderStatus: "delivered",
      payment: { status: "paid" },
      createdAt: new Date(nowMs - 5 * dayMs),
    });
    await Order.create({
      orderNumber: "ORD-C1",
      customer: pOrderedCancel._id,
      items: [
        {
          product: shoe._id,
          variantId: shoeVar._id,
          name: "Running Shoe",
          quantity: 1,
          unitPrice: 1500,
        },
      ],
      shippingAddress: { line1: "1 St", city: "M", postalCode: "400001" },
      subtotal: 1500,
      total: 1500,
      orderStatus: "cancelled",
      payment: { status: "refunded" },
      createdAt: new Date(nowMs - 35 * dayMs),
    });

    const ids = (arr) => arr.map((x) => String(x.customerId)).sort();

    // cart
    expect(ids(await resolveAudience("cart"))).toEqual([String(pOldCart._id)].sort());

    // wishlist
    expect(ids(await resolveAudience("wishlist"))).toEqual(
      [String(pOrderedDeliv._id), String(pRecentSess._id)].sort()
    );

    // category (parentCat includes childCat -> jacket; shoe is excluded)
    expect(ids(await resolveAudience("category", { categoryId: parentCat._id }))).toEqual(
      [String(pOldCart._id), String(pOrderedDeliv._id)].sort()
    );

    // inactive_30d: > 30d old, no recent order (<30d), no recent session (<30d)
    // Included: pOldCart, p31d, pOrderedCancel (order was 35d ago)
    // Excluded: pExact30 (createdAt === cutoff), pRecentSess (session 29d ago), pOrderedDeliv (order 5d ago), banned/deleted/inactive
    expect(ids(await resolveAudience("inactive_30d"))).toEqual(
      [String(pOldCart._id), String(p31d._id), String(pOrderedCancel._id)].sort()
    );

    // never_ordered: active profiles without any order
    expect(ids(await resolveAudience("never_ordered"))).toEqual(
      [String(pOldCart._id), String(pExact30._id), String(p31d._id), String(pRecentSess._id)].sort()
    );

    // bought_before: customers with any order (delivered or placed/cancelled)
    expect(ids(await resolveAudience("bought_before"))).toEqual(
      [String(pOrderedDeliv._id), String(pOrderedCancel._id)].sort()
    );
  });

  it("countAudience counts distinct customers with tokens accurately even with multiple tokens per customer", async () => {
    const cat = await Category.create({ name: "C", slug: "c" });
    const brand = await Brand.create({ name: "B", slug: "b" });
    const prod = await Product.create({
      name: "Item",
      slug: "item",
      category: cat._id,
      brand: brand._id,
      status: "active",
    });
    const variant = await ProductVariant.create({
      product: prod._id,
      sku: "I-1",
      price: 100,
      stock: 5,
    });

    const c1 = await CustomerProfile.create({ authUserId: "cnt-1", isActive: true });
    const c2 = await CustomerProfile.create({ authUserId: "cnt-2", isActive: true });
    await Cart.create({ customer: c1._id, items: [{ variant: variant._id, quantity: 1 }] });
    await Cart.create({ customer: c2._id, items: [{ variant: variant._id, quantity: 1 }] });

    await DeviceToken.insertMany([
      { customer: c1._id, token: "t1" },
      { customer: c1._id, token: "t2" },
    ]);

    expect(await countAudience("cart")).toEqual({ total: 2, withApp: 1 });
    expect(await countAudience("unknown_seg")).toEqual({ total: 0, withApp: 0 });
  });

  it("selects most recent line, keeps name/slug/image from the SAME line, prefers variant image, and counts distinct products", async () => {
    const cat = await Category.create({ name: "C", slug: "c" });
    const brand = await Brand.create({ name: "B", slug: "b" });

    const prodA = await Product.create({
      name: "Shirt A",
      slug: "shirt-a",
      category: cat._id,
      brand: brand._id,
      status: "active",
      images: [{ url: "https://ik.imagekit.io/test/shirt-a-prod.jpg" }],
    });
    const varA1 = await ProductVariant.create({
      product: prodA._id,
      sku: "SA-1",
      price: 500,
      stock: 5,
      images: [{ url: "https://ik.imagekit.io/test/shirt-a-red.jpg" }],
    });
    const varA2 = await ProductVariant.create({
      product: prodA._id,
      sku: "SA-2",
      price: 500,
      stock: 5,
      images: [], // no variant image -> falls back to product's first image
    });

    const prodNoImg = await Product.create({
      name: "No Photo Prod",
      slug: "no-photo-prod",
      category: cat._id,
      brand: brand._id,
      status: "active",
      images: [],
    });
    const varNoImg = await ProductVariant.create({
      product: prodNoImg._id,
      sku: "NP-1",
      price: 300,
      stock: 5,
      images: [],
    });

    const c1 = await CustomerProfile.create({ authUserId: "m1", isActive: true });
    const c2 = await CustomerProfile.create({ authUserId: "m2", isActive: true });
    const c3 = await CustomerProfile.create({ authUserId: "m3", isActive: true });

    // c1: 2 variants of prodA (count must be 1 distinct product!), latest has variant image
    await Cart.create({
      customer: c1._id,
      items: [
        { variant: varA2._id, quantity: 3 },
        { variant: varA1._id, quantity: 2 },
      ],
    });
    // c2: latest is varA2 (no variant image -> prodA image), plus prodNoImg -> count = 2 distinct products
    await Cart.create({
      customer: c2._id,
      items: [
        { variant: varNoImg._id, quantity: 1 },
        { variant: varA2._id, quantity: 1 },
      ],
    });
    // c3: latest is varNoImg -> image ""
    await Cart.create({
      customer: c3._id,
      items: [
        { variant: varA1._id, quantity: 1 },
        { variant: varNoImg._id, quantity: 1 },
      ],
    });

    const aud = await resolveAudience("cart");
    const byCust = new Map(aud.map((a) => [String(a.customerId), a]));

    expect(byCust.get(String(c1._id))).toMatchObject({
      count: 1,
      product: {
        name: "Shirt A",
        slug: "shirt-a",
        image: "https://ik.imagekit.io/test/shirt-a-red.jpg",
      },
    });
    expect(byCust.get(String(c2._id))).toMatchObject({
      count: 2,
      product: {
        name: "Shirt A",
        slug: "shirt-a",
        image: "https://ik.imagekit.io/test/shirt-a-prod.jpg",
      },
    });
    expect(byCust.get(String(c3._id))).toMatchObject({
      count: 2,
      product: {
        name: "No Photo Prod",
        slug: "no-photo-prod",
        image: "",
      },
    });
  });

  it("handles empty DB, invalid categoryId, wishlist variant image fallback, address fullName fallback, and cart+wishlist category precedence", async () => {
    // Empty DB coverage for all segments
    for (const seg of ["cart", "wishlist", "inactive_30d", "never_ordered", "bought_before"]) {
      expect(await resolveAudience(seg)).toEqual([]);
    }
    expect(await resolveAudience("category", { categoryId: "not-an-object-id" })).toEqual([]);

    const cat = await Category.create({ name: "Wear", slug: "wear" });
    const brand = await Brand.create({ name: "B", slug: "b" });
    const pWishVar = await Product.create({
      name: "WishProd",
      slug: "wish-prod",
      category: cat._id,
      brand: brand._id,
      status: "active",
      images: [],
    });
    const vWish = await ProductVariant.create({
      product: pWishVar._id,
      sku: "WP-1",
      price: 800,
      salePrice: 650,
      stock: 5,
      images: [{ url: "https://ik.imagekit.io/test/wish-var.jpg" }],
    });
    const pCart = await Product.create({
      name: "CartProd",
      slug: "cart-prod",
      category: cat._id,
      brand: brand._id,
      status: "active",
      images: [{ url: "https://ik.imagekit.io/test/cart-prod.jpg" }],
    });
    const vCart = await ProductVariant.create({
      product: pCart._id,
      sku: "CP-1",
      price: 500,
      stock: 5,
    });

    // Customer without customerUser doc -> falls back to default address fullName
    const cAddr = await CustomerProfile.create({
      authUserId: "no-user-doc",
      isActive: true,
      addresses: [
        {
          fullName: "Addr Name",
          line1: "1 St",
          city: "M",
          postalCode: "400001",
          country: "India",
          isDefault: true,
        },
      ],
    });
    const cart = await Cart.create({
      customer: cAddr._id,
      items: [{ variant: vCart._id, quantity: 1 }],
    });
    const wl = await Wishlist.create({ customer: cAddr._id, products: [pWishVar._id] });

    // Make wishlist newer than cart so wishlist wins in category audience
    await Cart.collection.updateOne(
      { _id: cart._id },
      { $set: { updatedAt: new Date("2026-11-20T00:00:00Z") } }
    );
    await Wishlist.collection.updateOne(
      { _id: wl._id },
      { $set: { updatedAt: new Date("2026-11-25T00:00:00Z") } }
    );

    const wlAud = await resolveAudience("wishlist");
    expect(wlAud).toHaveLength(1);
    expect(wlAud[0].name).toBe("Addr Name");
    expect(wlAud[0].product).toEqual({
      name: "WishProd",
      slug: "wish-prod",
      image: "https://ik.imagekit.io/test/wish-var.jpg",
      price: 650,
    });

    const catAud = await resolveAudience("category", { categoryId: cat._id });
    expect(catAud).toHaveLength(1);
    expect(catAud[0].count).toBe(2);
    expect(catAud[0].product.name).toBe("WishProd");
    expect(catAud[0].product.image).toBe("https://ik.imagekit.io/test/wish-var.jpg");

    // Additional edge cases: orphaned refs, inactive owners in cart/wishlist/category, no-variant wishlist product, cart newer than wishlist, recent userCreatedAt
    const otherCat = await Category.create({ name: "Other", slug: "other" });
    const pOther = await Product.create({
      name: "OtherProd",
      slug: "other-prod",
      category: otherCat._id,
      brand: brand._id,
      status: "active",
    });
    const vOther = await ProductVariant.create({
      product: pOther._id,
      sku: "OP-1",
      price: 200,
      stock: 5,
    });

    const pNoVarNoImg = await Product.create({
      name: "NoVarProd",
      slug: "no-var-prod",
      category: cat._id,
      brand: brand._id,
      status: "active",
      images: [],
    });

    const cBlocked = await CustomerProfile.create({ authUserId: "blk-aud", isActive: false });
    await Cart.create({ customer: cBlocked._id, items: [{ variant: vCart._id, quantity: 1 }] });
    await Wishlist.create({ customer: cBlocked._id, products: [pWishVar._id] });

    const cOrphan = await CustomerProfile.create({ authUserId: "orph-aud", isActive: true });
    await Cart.create({
      customer: cOrphan._id,
      items: [{ variant: new mongoose.Types.ObjectId(), quantity: 1 }],
    });
    await Wishlist.create({ customer: cOrphan._id, products: [new mongoose.Types.ObjectId()] });

    const cOtherOnly = await CustomerProfile.create({ authUserId: "other-only", isActive: true });
    await Cart.create({ customer: cOtherOnly._id, items: [{ variant: vOther._id, quantity: 1 }] });
    await Wishlist.create({ customer: cOtherOnly._id, products: [pOther._id] });

    // Customer with pNoVarNoImg in wishlist + vCart in cart, where cart is NEWER than wishlist
    const cCartNewer = await CustomerProfile.create({ authUserId: "cart-newer", isActive: true });
    const cartNew = await Cart.create({
      customer: cCartNewer._id,
      items: [{ variant: vCart._id, quantity: 1 }],
    });
    const wlOld = await Wishlist.create({ customer: cCartNewer._id, products: [pNoVarNoImg._id] });
    await Cart.collection.updateOne(
      { _id: cartNew._id },
      { $set: { updatedAt: new Date("2026-11-26T00:00:00Z") } }
    );
    await Wishlist.collection.updateOne(
      { _id: wlOld._id },
      { $set: { updatedAt: new Date("2026-11-20T00:00:00Z") } }
    );

    // Also wishlist-only customer with pNoVarNoImg (0 variants, 0 images)
    const cNoVarWl = await CustomerProfile.create({ authUserId: "novar-wl", isActive: true });
    await Wishlist.create({ customer: cNoVarWl._id, products: [pNoVarNoImg._id] });

    const catAud2 = await resolveAudience("category", { categoryId: cat._id });
    const catMap2 = new Map(catAud2.map((e) => [String(e.customerId), e]));
    expect(catMap2.has(String(cBlocked._id))).toBe(false);
    expect(catMap2.has(String(cOtherOnly._id))).toBe(false);
    expect(catMap2.get(String(cCartNewer._id)).product.name).toBe("CartProd");
    expect(catMap2.get(String(cNoVarWl._id)).product).toEqual({
      name: "NoVarProd",
      slug: "no-var-prod",
      image: "",
      price: 0,
    });

    // inactive_30d excludes profile created 40d ago if customerUser.createdAt is < 30d ago
    useFakeClock("2026-11-27T12:00:00.000Z");
    const db = mongoose.connection.db;
    const recentUserRes = await db.collection("customerUser").insertOne({
      name: "RecentUser",
      createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    });
    const oldProfRecentUser = await CustomerProfile.create({
      authUserId: String(recentUserRes.insertedId),
      isActive: true,
      createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000),
    });
    const inact = await resolveAudience("inactive_30d");
    expect(inact.some((x) => String(x.customerId) === String(oldProfRecentUser._id))).toBe(false);
  });
});
