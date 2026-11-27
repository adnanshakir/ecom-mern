import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import { createNotificationTestMocks, createAdminUser, useFakeClock, waitFor } from "./_helpers.js";

await import("../../config/config.js");
delete process.env.FIREBASE_SERVICE_ACCOUNT_B64;
delete process.env.ENABLE_PUSH_STUB;

const mockCtrl = createNotificationTestMocks();

const { default: app } = await import("../../app.js");
const { runCartReminders } = await import("../../services/notificationService.js");
const {
  default: notificationTriggers,
  notifyRestock,
  notifyPriceDrop,
  notifyPriceDropsBulk,
  getProductMinEffectivePrice,
} = await import("../../services/notificationTriggers.js");
const { seedNotificationTemplates } = await import("../../seed/notificationTemplates.js");
const { default: User } = await import("../../models/admin/user.model.js");
const { default: Category } = await import("../../models/admin/category.model.js");
const { default: Brand } = await import("../../models/admin/brand.model.js");
const { default: Product } = await import("../../models/admin/product.model.js");
const { default: ProductVariant } = await import("../../models/admin/productVariant.model.js");
const { default: CustomerProfile } = await import("../../models/customer/customer.model.js");
const { default: Cart } = await import("../../models/customer/cart.model.js");
const { default: Wishlist } = await import("../../models/customer/wishlist.model.js");
const { default: Order } = await import("../../models/customer/order.model.js");
const { default: DeviceToken } = await import("../../models/DeviceToken.js");
const { default: NotificationLog } = await import("../../models/NotificationLog.js");
const { default: NotificationTemplate } = await import("../../models/NotificationTemplate.js");
const { default: ImportJob } = await import("../../models/admin/importJob.model.js");
const { connectTestDB, closeTestDB, clearTestDB } = await import("../setup.js");

let adminToken;
let cat;
let brand;

beforeAll(async () => {
  await connectTestDB();
}, 30000);

beforeEach(async () => {
  mockCtrl.reset();
  await clearTestDB();
  await seedNotificationTemplates();
  process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/test";

  const admin = await createAdminUser(User, app, { role: "admin", email: "admin@test.com" });
  adminToken = admin.token;
  cat = await Category.create({ name: "Apparel", slug: "apparel" });
  brand = await Brand.create({ name: "Fibio", slug: "fibio" });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

afterAll(async () => {
  await closeTestDB();
});

describe("Automatic Notification Triggers", () => {
  describe("Restock", () => {
    it("fires only when total stock crosses from <= 0 to > 0, only for wishlist owners, respects enabled flag, and never fails HTTP 200/201", async () => {
      const prod = await Product.create({
        name: "Denim Jacket",
        slug: "denim-jacket",
        category: cat._id,
        brand: brand._id,
        status: "active",
        images: [{ url: "https://ik.imagekit.io/test/jacket.jpg" }],
      });
      const vZero = await ProductVariant.create({
        product: prod._id,
        sku: "DJ-0",
        price: 1000,
        stock: 0,
      });
      const custWish = await CustomerProfile.create({ authUserId: "rw-1", isActive: true });
      const custOther = await CustomerProfile.create({ authUserId: "rw-2", isActive: true });
      await DeviceToken.create({ customer: custWish._id, token: "tok-rw1" });
      await DeviceToken.create({ customer: custOther._id, token: "tok-rw2" });
      await Wishlist.create({ customer: custWish._id, products: [prod._id] });

      // 0 -> 0 correction: no restock
      const r00 = await request(app)
        .post("/api/inventory/movements")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ variantId: vZero._id, type: "correction", quantity: 0, reason: "Noop" });
      expect(r00.status).toBe(201);
      expect(mockCtrl.mocks.sendEachForMulticastMock).toHaveBeenCalledTimes(0);

      // 0 -> 5 restock: fires ONCE to custWish
      const r05 = await request(app)
        .post("/api/inventory/movements")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ variantId: vZero._id, type: "restock", quantity: 5, reason: "Restocked" });
      expect(r05.status).toBe(201);
      await waitFor(() => {
        expect(mockCtrl.mocks.sendEachForMulticastMock).toHaveBeenCalledTimes(1);
      });
      expect(mockCtrl.state.multicastCalls[0].tokens).toEqual(["tok-rw1"]);
      expect(mockCtrl.state.multicastCalls[0].data.link).toBe("/product/denim-jacket");
      expect(mockCtrl.state.multicastCalls[0].notification.imageUrl).toBe(
        "https://ik.imagekit.io/test/jacket.jpg?tr=w-800,h-400,fo-auto,q-70"
      );

      // 5 -> 10 restock: already > 0, does NOT fire
      const r510 = await request(app)
        .post("/api/inventory/movements")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ variantId: vZero._id, type: "restock", quantity: 5, reason: "Topup" });
      expect(r510.status).toBe(201);
      expect(mockCtrl.mocks.sendEachForMulticastMock).toHaveBeenCalledTimes(1);

      // Add new variant with stock > 0 when product stock is 0 -> triggers restock
      await ProductVariant.updateOne({ _id: vZero._id }, { $set: { stock: 0 } });
      const rAddVar = await request(app)
        .post(`/api/products/${prod._id}/variants`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ sku: "DJ-NEW", price: 1100, stock: 3 });
      expect(rAddVar.status).toBe(201);
      await waitFor(() => {
        expect(mockCtrl.mocks.sendEachForMulticastMock).toHaveBeenCalledTimes(2);
      });

      // Disabled template sends nothing
      await NotificationTemplate.updateOne({ key: "restock" }, { enabled: false });
      await notifyRestock(prod);
      expect(mockCtrl.mocks.sendEachForMulticastMock).toHaveBeenCalledTimes(2);

      // Firebase failure inside trigger never changes HTTP status of stock update
      await NotificationTemplate.updateOne({ key: "restock" }, { enabled: true });
      await ProductVariant.updateMany({ product: prod._id }, { $set: { stock: 0 } });
      mockCtrl.setMulticastHandler(async () => {
        throw new Error("Firebase crashed");
      });
      const rErr = await request(app)
        .post("/api/inventory/movements")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          variantId: vZero._id,
          type: "restock",
          quantity: 4,
          reason: "Restock during outage",
        });
      expect(rErr.status).toBe(201);
      await waitFor(() => {
        expect(mockCtrl.mocks.sendEachForMulticastMock).toHaveBeenCalledTimes(3);
      });
    });

    it("covers CSV import restock trigger and ensures a trigger failure does not fail or roll back ImportJob", async () => {
      const cust = await CustomerProfile.create({ authUserId: "csv-c", isActive: true });
      await DeviceToken.create({ customer: cust._id, token: "tok-csv" });

      mockCtrl.setMulticastHandler(async () => {
        throw new Error("FCM down");
      });

      const confirmRes = await request(app)
        .post("/api/products/import/confirm")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          fileName: "restock.csv",
          products: [
            {
              valid: true,
              handle: "csv-coat",
              product: {
                name: "CSV Coat",
                description: "Warm coat",
                categoryPath: [{ name: "Apparel" }],
                brandName: "Fibio",
                images: [],
              },
              variants: [{ sku: "CSV-1", price: 1500, stock: 5 }],
            },
          ],
        });

      expect(confirmRes.status).toBe(201);
      expect(confirmRes.body.data.successCount).toBe(1);
      const job = await ImportJob.findById(confirmRes.body.data.importJobId).lean();
      expect(job.status).toBe("completed");
      expect(job.createdProductIds).toHaveLength(1);
    });
  });

  describe("Order status", () => {
    it("sends once atomically on shipped, sends once on delivered, blocks cancelled/invalid, and succeeds when token missing or Firebase fails", async () => {
      const prod = await Product.create({
        name: "Kurta",
        slug: "kurta",
        category: cat._id,
        brand: brand._id,
        status: "active",
        images: [{ url: "https://ik.imagekit.io/test/kurta.jpg" }],
      });
      const variant = await ProductVariant.create({
        product: prod._id,
        sku: "K-1",
        price: 800,
        stock: 10,
      });
      const cWithTok = await CustomerProfile.create({ authUserId: "ord-c1", isActive: true });
      const cNoTok = await CustomerProfile.create({ authUserId: "ord-c2", isActive: true });
      await DeviceToken.create({ customer: cWithTok._id, token: "tok-ord1" });

      const mkOrder = (num, custId, status = "packed") =>
        Order.create({
          orderNumber: num,
          customer: custId,
          items: [
            {
              product: prod._id,
              variantId: variant._id,
              name: "Kurta",
              image: "https://ik.imagekit.io/test/kurta.jpg",
              quantity: 1,
              unitPrice: 800,
            },
          ],
          shippingAddress: { line1: "1 St", city: "M", postalCode: "400001" },
          subtotal: 800,
          total: 800,
          orderStatus: status,
          payment: { status: "paid" },
        });

      const ord1 = await mkOrder("ORD-101", cWithTok._id);
      const rShip1 = await request(app)
        .patch(`/api/orders/${ord1._id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ orderStatus: "shipped" });
      expect(rShip1.status).toBe(200);
      await waitFor(() => {
        expect(mockCtrl.mocks.sendEachForMulticastMock).toHaveBeenCalledTimes(1);
      });

      // Shipped again -> atomic no-op, sends none
      const rShip2 = await request(app)
        .patch(`/api/orders/${ord1._id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ orderStatus: "shipped" });
      expect(rShip2.status).toBe(200);
      expect(mockCtrl.mocks.sendEachForMulticastMock).toHaveBeenCalledTimes(1);

      // Delivered -> sends once
      const rDeliv = await request(app)
        .patch(`/api/orders/${ord1._id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ orderStatus: "delivered" });
      expect(rDeliv.status).toBe(200);
      await waitFor(() => {
        expect(mockCtrl.mocks.sendEachForMulticastMock).toHaveBeenCalledTimes(2);
      });

      // Cancelled order cannot change status and sends nothing
      const ordCancelled = await mkOrder("ORD-102", cWithTok._id, "cancelled");
      const rCan = await request(app)
        .patch(`/api/orders/${ordCancelled._id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ orderStatus: "shipped" });
      expect(rCan.status).toBe(409);
      expect(mockCtrl.mocks.sendEachForMulticastMock).toHaveBeenCalledTimes(2);

      // Invalid status -> 400
      const rInv = await request(app)
        .patch(`/api/orders/${ord1._id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ orderStatus: "lost_in_space" });
      expect(rInv.status).toBe(400);

      // Customer with no token -> 200, no Firebase call
      const ordNoTok = await mkOrder("ORD-103", cNoTok._id, "packed");
      const rNoTok = await request(app)
        .patch(`/api/orders/${ordNoTok._id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ orderStatus: "shipped" });
      expect(rNoTok.status).toBe(200);
      expect(mockCtrl.mocks.sendEachForMulticastMock).toHaveBeenCalledTimes(2);

      // Firebase error path still leaves HTTP status update 200
      mockCtrl.setMulticastHandler(async () => {
        throw new Error("FCM failed");
      });
      const ordErr = await mkOrder("ORD-104", cWithTok._id, "packed");
      const rErr = await request(app)
        .patch(`/api/orders/${ordErr._id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ orderStatus: "shipped" });
      expect(rErr.status).toBe(200);
      await waitFor(() => {
        expect(mockCtrl.mocks.sendEachForMulticastMock).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe("Price drop single", () => {
    it("enforces 4.99% vs 5.00% threshold, effective salePrice, variant cart scoping, 168h cooldown, 24h cap, disabled template, and exact /product/<slug> + variant image", async () => {
      useFakeClock("2026-11-27T12:00:00.000Z");
      await NotificationTemplate.updateOne({ key: "price_drop" }, { enabled: true });

      const prod = await Product.create({
        name: "Leather Belt",
        slug: "leather-belt",
        category: cat._id,
        brand: brand._id,
        status: "active",
        images: [{ url: "https://ik.imagekit.io/test/belt-prod.jpg" }],
      });
      const v1 = await ProductVariant.create({
        product: prod._id,
        sku: "LB-1",
        price: 1000,
        stock: 10,
        images: [{ url: "https://ik.imagekit.io/test/belt-v1.jpg" }],
      });
      const vCheap = await ProductVariant.create({
        product: prod._id,
        sku: "LB-2",
        price: 500,
        stock: 10,
      });

      const cCartV1 = await CustomerProfile.create({ authUserId: "pd-1", isActive: true });
      const cCartVCheap = await CustomerProfile.create({ authUserId: "pd-2", isActive: true });
      const cOther = await CustomerProfile.create({ authUserId: "pd-3", isActive: true });
      await DeviceToken.create({ customer: cCartV1._id, token: "tok-pd1" });
      await DeviceToken.create({ customer: cCartVCheap._id, token: "tok-pd2" });
      await DeviceToken.create({ customer: cOther._id, token: "tok-pd3" });

      await Cart.create({ customer: cCartV1._id, items: [{ variant: v1._id, quantity: 1 }] });
      await Cart.create({
        customer: cCartVCheap._id,
        items: [{ variant: vCheap._id, quantity: 1 }],
      });
      await Wishlist.create({ customer: cCartVCheap._id, products: [prod._id] });

      // 4.99% drop (1000 -> 950.10): NO
      await notifyPriceDrop(prod, 1000, 950.1, v1._id);
      expect(mockCtrl.mocks.sendEachMock).toHaveBeenCalledTimes(0);

      // Price increase (1000 -> 1200): NO
      await notifyPriceDrop(prod, 1000, 1200, v1._id);
      expect(mockCtrl.mocks.sendEachMock).toHaveBeenCalledTimes(0);

      // 5.00% drop via variant edit (1000 -> 950) -> notifies ONLY cCartV1 (cCartVCheap has cheaper variant, wishlist min stays 500)
      const editRes = await request(app)
        .put(`/api/products/${prod._id}/variants/${v1._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ price: 1000, salePrice: 950 });
      expect(editRes.status).toBe(200);
      await waitFor(() => {
        expect(mockCtrl.mocks.sendEachMock).toHaveBeenCalledTimes(1);
      });
      expect(mockCtrl.state.sendEachCalls[0]).toHaveLength(1);
      const sentMsg = mockCtrl.state.sendEachCalls[0][0];
      expect(sentMsg.token).toBe("tok-pd1");
      expect(sentMsg.data.link).toBe("/product/leather-belt");
      expect(sentMsg.data.link).not.toContain("/products/");
      // Uses variant image for cart line
      expect(sentMsg.notification.imageUrl).toBe(
        "https://ik.imagekit.io/test/belt-v1.jpg?tr=w-800,h-400,fo-auto,q-70"
      );

      // 168h cooldown: at +167h59m blocked; at +168h00m allowed
      jest.setSystemTime(new Date(Date.now() + (168 * 3600 - 60) * 1000));
      await notifyPriceDrop(prod, 950, 800, v1._id);
      expect(mockCtrl.mocks.sendEachMock).toHaveBeenCalledTimes(1);

      jest.setSystemTime(new Date(Date.now() + 60 * 1000));
      await notifyPriceDrop(prod, 950, 800, v1._id);
      expect(mockCtrl.mocks.sendEachMock).toHaveBeenCalledTimes(2);

      // 24h marketing cap blocks even if different key
      await NotificationLog.updateMany(
        { customer: cCartV1._id },
        { $set: { key: "cart_reminder", sentAt: new Date() } }
      );
      await notifyPriceDrop(prod, 800, 600, v1._id);
      expect(mockCtrl.mocks.sendEachMock).toHaveBeenCalledTimes(2);

      // Disabled template sends nothing
      jest.setSystemTime(new Date(Date.now() + 200 * 3600 * 1000));
      await NotificationTemplate.updateOne({ key: "price_drop" }, { enabled: false });
      await notifyPriceDrop(prod, 600, 400, v1._id);
      expect(mockCtrl.mocks.sendEachMock).toHaveBeenCalledTimes(2);

      // Wishlist-only notification (no variantId) + invalid inputs
      await NotificationTemplate.updateOne({ key: "price_drop" }, { enabled: true });
      await Cart.deleteMany({ customer: cCartV1._id });
      await notifyPriceDrop(null, 100, 50);
      await notifyPriceDrop(prod, 0, 50);
      await notifyPriceDrop(prod, 1000, 800); // notifies cCartVCheap via wishlist
      expect(mockCtrl.mocks.sendEachMock).toHaveBeenCalledTimes(3);
      expect(mockCtrl.state.sendEachCalls[2][0].token).toBe("tok-pd2");
      expect(mockCtrl.state.sendEachCalls[2][0].notification.imageUrl).toBe(
        "https://ik.imagekit.io/test/belt-prod.jpg?tr=w-800,h-400,fo-auto,q-70"
      );
    });
  });

  describe("Price drop bulk", () => {
    it("caps at top 100 by percentage, sends 1 push per customer, handles single vs multi summary, and sends in 1 sendEach batch", async () => {
      await NotificationTemplate.updateOne({ key: "price_drop" }, { enabled: true });

      const prods = await Product.insertMany(
        Array.from({ length: 101 }, (_, i) => ({
          name: `Bulk Prod ${i}`,
          slug: `bulk-prod-${i}`,
          category: cat._id,
          brand: brand._id,
          status: "active",
          images: [{ url: `https://ik.imagekit.io/test/bp-${i}.jpg` }],
        }))
      );
      const vars = await ProductVariant.insertMany(
        prods.map((p, i) => ({ product: p._id, sku: `BP-${i}`, price: 1000, stock: 5 }))
      );

      const cMulti = await CustomerProfile.create({ authUserId: "bm-1", isActive: true });
      const cSingle = await CustomerProfile.create({ authUserId: "bm-2", isActive: true });
      const cExcludedDrop = await CustomerProfile.create({ authUserId: "bm-3", isActive: true });
      await DeviceToken.create({ customer: cMulti._id, token: "tok-bm1" });
      await DeviceToken.create({ customer: cSingle._id, token: "tok-bm2" });
      await DeviceToken.create({ customer: cExcludedDrop._id, token: "tok-bm3" });

      // cMulti has 5 affected items in cart/wishlist (including #100 with biggest 80% drop and #0 with 10% drop)
      await Cart.create({
        customer: cMulti._id,
        items: [
          { variant: vars[1]._id, quantity: 1 },
          { variant: vars[2]._id, quantity: 1 },
          { variant: vars[3]._id, quantity: 1 },
        ],
      });
      await Wishlist.create({ customer: cMulti._id, products: [prods[4]._id, prods[100]._id] });
      // cSingle has 1 affected item in cart only (#50)
      await Cart.create({ customer: cSingle._id, items: [{ variant: vars[50]._id, quantity: 1 }] });
      // cExcludedDrop has only item #0 (smallest drop 5% -> ranked 101st, dropped by top-100 cap)
      await Cart.create({
        customer: cExcludedDrop._id,
        items: [{ variant: vars[0]._id, quantity: 1 }],
      });

      const drops = prods.map((p, i) => ({
        productId: p._id,
        name: p.name,
        slug: p.slug,
        image: p.images[0].url,
        oldPrice: 1000,
        newPrice: i === 0 ? 950 : i === 100 ? 200 : 900 - i, // #0 is 5% (smallest), #100 is 80% (biggest)
      }));

      await notifyPriceDropsBulk(drops);

      expect(mockCtrl.mocks.sendEachMock).toHaveBeenCalledTimes(1);
      const msgs = mockCtrl.state.sendEachCalls[0];
      expect(msgs).toHaveLength(2);

      const byTok = new Map(msgs.map((m) => [m.token, m]));
      expect(byTok.has("tok-bm3")).toBe(false); // 101st drop excluded

      // cMulti: 5 items -> summary message with biggest drop (#100), count text "4 more", /wishlist (wishlist item present)
      expect(byTok.get("tok-bm1")).toMatchObject({
        notification: {
          title: "📉 Prices dropped on items you like",
          body: "Bulk Prod 100 and 4 more are cheaper now.",
          imageUrl: "https://ik.imagekit.io/test/bp-100.jpg?tr=w-800,h-400,fo-auto,q-70",
        },
        data: {
          link: "/wishlist",
          imageUrl: "https://ik.imagekit.io/test/bp-100.jpg?tr=w-800,h-400,fo-auto,q-70",
        },
      });

      // cSingle: 1 item -> normal price_drop message, /product/bulk-prod-50
      expect(byTok.get("tok-bm2").data.link).toBe("/product/bulk-prod-50");
      expect(byTok.get("tok-bm2").notification.title).toBe("📉 Price drop: Bulk Prod 50");
      expect(byTok.get("tok-bm2").notification.imageUrl).toBe(
        "https://ik.imagekit.io/test/bp-50.jpg?tr=w-800,h-400,fo-auto,q-70"
      );

      // Edge cases: empty/invalid drops and disabled template
      await notifyPriceDropsBulk([]);
      await notifyPriceDropsBulk([{ productId: prods[0]._id, oldPrice: 100, newPrice: 99 }]);
      await NotificationTemplate.updateOne({ key: "price_drop" }, { enabled: false });
      await notifyPriceDropsBulk(drops);
      expect(mockCtrl.mocks.sendEachMock).toHaveBeenCalledTimes(1);

      // Additional branch coverage for triggers: getProductMinEffectivePrice, variant-image restock, no-variant wishlist, duplicate bulk drop fallback
      expect(getProductMinEffectivePrice([])).toBe(0);
      expect(getProductMinEffectivePrice([{ price: 500, salePrice: 400 }, { price: 300 }])).toBe(
        300
      );

      // Restock on product with no product images -> falls back to variant image
      const pVarImg = await Product.create({
        name: "VarImg Prod",
        slug: "varimg-prod",
        category: cat._id,
        brand: brand._id,
        status: "active",
        images: [],
      });
      await ProductVariant.create({
        product: pVarImg._id,
        sku: "VI-1",
        price: 500,
        stock: 5,
        images: [{ url: "https://ik.imagekit.io/test/vi.jpg" }],
      });
      await Wishlist.create({ customer: cSingle._id, products: [pVarImg._id] });
      await notifyRestock(pVarImg);
      expect(
        mockCtrl.state.multicastCalls[mockCtrl.state.multicastCalls.length - 1].notification
          .imageUrl
      ).toBe("https://ik.imagekit.io/test/vi.jpg?tr=w-800,h-400,fo-auto,q-70");

      // Price drop when product has 0 variants and variantId passed (wishlist skipped) & inactive customer skipped
      const pNoVar = await Product.create({
        name: "NoVar Prod",
        slug: "novar-prod",
        category: cat._id,
        brand: brand._id,
        status: "active",
      });
      await Wishlist.updateOne(
        { customer: cSingle._id },
        { $addToSet: { products: pNoVar._id } },
        { upsert: true }
      );
      await notifyPriceDrop(pNoVar, 1000, 500, new mongoose.Types.ObjectId());

      const pBlocked = await CustomerProfile.create({ authUserId: "blk-pd", isActive: false });
      await Wishlist.create({ customer: pBlocked._id, products: [prods[0]._id] });
      await NotificationTemplate.updateOne({ key: "price_drop" }, { enabled: true });
      await notifyPriceDrop(prods[0], 1000, 800);

      // Bulk drop with duplicate product keeping max dropPct and fallback image from variant
      await notifyPriceDropsBulk([
        {
          productId: pVarImg._id,
          name: pVarImg.name,
          slug: pVarImg.slug,
          image: "",
          oldPrice: 500,
          newPrice: 450,
        },
        {
          productId: pVarImg._id,
          name: pVarImg.name,
          slug: pVarImg.slug,
          image: "",
          oldPrice: 500,
          newPrice: 300,
        },
      ]);
      // Bulk drop on product with 0 variants
      await notifyPriceDropsBulk([
        {
          productId: pNoVar._id,
          name: pNoVar.name,
          slug: pNoVar.slug,
          image: "",
          oldPrice: 500,
          newPrice: 300,
        },
      ]);

      // Restock with no product image AND no variant images
      await notifyRestock(pNoVar);

      // Price drop on product with no product image, target variant has no image, sibling variant has image
      const pSib = await Product.create({
        name: "SibImg Prod",
        slug: "sibimg-prod",
        category: cat._id,
        brand: brand._id,
        status: "active",
        images: [],
      });
      const vSibNoImg = await ProductVariant.create({
        product: pSib._id,
        sku: "SB-1",
        price: 1000,
        stock: 5,
      });
      await ProductVariant.create({
        product: pSib._id,
        sku: "SB-2",
        price: 1200,
        stock: 5,
        images: [{ url: "https://ik.imagekit.io/test/sib-v2.jpg" }],
      });
      const cSib = await CustomerProfile.create({ authUserId: "sib-c", isActive: true });
      await DeviceToken.create({ customer: cSib._id, token: "tok-sib" });
      await Cart.create({ customer: cSib._id, items: [{ variant: vSibNoImg._id, quantity: 1 }] });
      await notifyPriceDrop(pSib, 1000, 800, vSibNoImg._id);

      // Price drop when only an inactive customer has the item (activeMap.size === 0)
      const cOnlyInact = await CustomerProfile.create({
        authUserId: "only-inact",
        isActive: false,
      });
      const pInactOnly = await Product.create({
        name: "InactOnly",
        slug: "inact-only",
        category: cat._id,
        brand: brand._id,
        status: "active",
      });
      const vInactOnly = await ProductVariant.create({
        product: pInactOnly._id,
        sku: "IO-1",
        price: 1000,
        stock: 5,
      });
      await Cart.create({
        customer: cOnlyInact._id,
        items: [{ variant: vInactOnly._id, quantity: 1 }],
      });
      await notifyPriceDrop(pInactOnly, 1000, 800, vInactOnly._id);
      await notifyPriceDropsBulk([
        {
          productId: pInactOnly._id,
          name: pInactOnly.name,
          slug: pInactOnly.slug,
          image: "",
          oldPrice: 1000,
          newPrice: 700,
        },
      ]);
      // Bulk drop with no customers in cart/wishlist
      const pNoOwners = await Product.create({
        name: "NoOwners",
        slug: "no-owners",
        category: cat._id,
        brand: brand._id,
        status: "active",
      });
      await notifyPriceDropsBulk([
        {
          productId: pNoOwners._id,
          name: pNoOwners.name,
          slug: pNoOwners.slug,
          image: "",
          oldPrice: 1000,
          newPrice: 700,
        },
      ]);
    });
  });

  describe("Cart reminder", () => {
    it("enforces 24h..72h idle window boundaries, empty cart exclusion, 72h cooldown, 24h marketing cap, and disabled toggle", async () => {
      useFakeClock("2026-11-27T12:00:00.000Z");
      await NotificationTemplate.updateOne({ key: "cart_reminder" }, { enabled: true });

      const prod = await Product.create({
        name: "Canvas Tote",
        slug: "canvas-tote",
        category: cat._id,
        brand: brand._id,
        status: "active",
        images: [{ url: "https://ik.imagekit.io/test/tote.jpg" }],
      });
      const v = await ProductVariant.create({
        product: prod._id,
        sku: "CT-1",
        price: 500,
        stock: 5,
        images: [{ url: "https://ik.imagekit.io/test/tote-var.jpg" }],
      });

      const mkCartAt = async (uid, ageMs, items) => {
        const prof = await CustomerProfile.create({ authUserId: uid, isActive: true });
        await DeviceToken.create({ customer: prof._id, token: `tok-${uid}` });
        const cart = await Cart.create({ customer: prof._id, items });
        await Cart.collection.updateOne(
          { _id: cart._id },
          { $set: { updatedAt: new Date(Date.now() - ageMs) } }
        );
        return prof;
      };

      const hour = 3600 * 1000;
      await mkCartAt("cr-2359", 24 * hour - 60 * 1000, [{ variant: v._id, quantity: 1 }]); // 23h59m -> NO
      await mkCartAt("cr-2400", 24 * hour, [{ variant: v._id, quantity: 1 }]); // 24h -> YES
      await mkCartAt("cr-7200", 72 * hour, [{ variant: v._id, quantity: 1 }]); // 72h -> YES
      await mkCartAt("cr-7201", 72 * hour + 60 * 1000, [{ variant: v._id, quantity: 1 }]); // 72h+1m -> NO
      await mkCartAt("cr-empty", 30 * hour, []); // empty -> NO

      await runCartReminders();
      expect(mockCtrl.mocks.sendEachMock).toHaveBeenCalledTimes(1);
      const tokens = mockCtrl.state.sendEachCalls[0].map((m) => m.token).sort();
      expect(tokens).toEqual(["tok-cr-2400", "tok-cr-7200"]);
      expect(mockCtrl.state.sendEachCalls[0][0].notification.imageUrl).toBe(
        "https://ik.imagekit.io/test/tote-var.jpg?tr=w-800,h-400,fo-auto,q-70"
      );

      // Second run immediately sends nothing (72h cooldown)
      await runCartReminders();
      expect(mockCtrl.mocks.sendEachMock).toHaveBeenCalledTimes(1);
    });
  });
});
