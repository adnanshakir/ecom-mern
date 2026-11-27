import { jest } from "@jest/globals";
import request from "supertest";
import { createNotificationTestMocks, useFakeClock, waitFor } from "./_helpers.js";

await import("../../config/config.js");
delete process.env.FIREBASE_SERVICE_ACCOUNT_B64;
delete process.env.ENABLE_PUSH_STUB;

const mockCtrl = createNotificationTestMocks();

const { default: app } = await import("../../app.js");
const { startNotificationScheduler } = await import("../../services/notificationService.js");
const { notifyRestock } = await import("../../services/notificationTriggers.js");
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
const { default: Notification } = await import("../../models/Notification.js");
const { connectTestDB, closeTestDB, clearTestDB } = await import("../setup.js");

let adminToken;
let brand;

beforeAll(async () => {
  await connectTestDB();
}, 30000);

beforeEach(async () => {
  mockCtrl.reset();
  await clearTestDB();
  await seedNotificationTemplates();
  process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/test";
  process.env.NODE_ENV = "test";
  delete process.env.ENABLE_PUSH_STUB;
  delete process.env.DISABLE_SCHEDULER;

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
  brand = await Brand.create({ name: "Fibio", slug: "fibio" });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

afterAll(async () => {
  await closeTestDB();
});

describe("Part B: Automatic notification images end-to-end", () => {
  it("resolves product image for /product/<slug>, pushes through pushImage, and persists resolved imageUrl in DB/History", async () => {
    const cat = await Category.create({ name: "Jackets", slug: "jackets" });
    const prod = await Product.create({
      name: "Denim Jacket",
      slug: "denim-jacket",
      category: cat._id,
      brand: brand._id,
      status: "active",
      images: [{ url: "https://ik.imagekit.io/test/jacket.jpg" }],
    });
    await ProductVariant.create({ product: prod._id, sku: "DJ-1", price: 1200, stock: 5 });

    const res = await request(app)
      .post("/api/admin/notifications")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Jacket Drop",
        body: "Check it out",
        channel: "app",
        link: "/product/denim-jacket",
        sendNow: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.notification.imageUrl).toBe("https://ik.imagekit.io/test/jacket.jpg");
    expect(mockCtrl.mocks.sendMock).toHaveBeenCalledTimes(1);
    expect(mockCtrl.state.sendCalls[0].notification.imageUrl).toBe(
      "https://ik.imagekit.io/test/jacket.jpg?tr=w-800,h-400,fo-auto,q-70"
    );

    const hist = await request(app)
      .get("/api/admin/notifications")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(hist.status).toBe(200);
    expect(hist.body.notifications[0].imageUrl).toBe("https://ik.imagekit.io/test/jacket.jpg");
  });

  it("resolves category own image and falls back to best-stocked product image when category has none", async () => {
    const catWithImg = await Category.create({
      name: "Shirts",
      slug: "shirts",
      image: { url: "https://ik.imagekit.io/test/cat-shirts.jpg" },
    });
    const catNoImg = await Category.create({ name: "Jeans", slug: "jeans" });
    const p = await Product.create({
      name: "Slim Jeans",
      slug: "slim-jeans",
      category: catNoImg._id,
      brand: brand._id,
      status: "active",
      images: [{ url: "https://ik.imagekit.io/test/jeans.jpg" }],
    });
    await ProductVariant.create({ product: p._id, sku: "SJ-1", price: 999, stock: 12 });

    const r1 = await request(app)
      .post("/api/admin/notifications")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Shirts", channel: "app", link: "/category/shirts", sendNow: true });
    expect(r1.status).toBe(201);
    expect(r1.body.notification.imageUrl).toBe("https://ik.imagekit.io/test/cat-shirts.jpg");

    const r2 = await request(app)
      .post("/api/admin/notifications")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Jeans", channel: "app", link: "/category/jeans", sendNow: true });
    expect(r2.status).toBe(201);
    expect(r2.body.notification.imageUrl).toBe("https://ik.imagekit.io/test/jeans.jpg");
    expect(mockCtrl.state.sendCalls[1].notification.imageUrl).toBe(
      "https://ik.imagekit.io/test/jeans.jpg?tr=w-800,h-400,fo-auto,q-70"
    );
  });

  it("lets custom image win over auto, sends no image when autoImage=false, and rejects non-https custom URL with 400", async () => {
    const cat = await Category.create({ name: "Tops", slug: "tops" });
    const p = await Product.create({
      name: "Polo",
      slug: "polo",
      category: cat._id,
      brand: brand._id,
      status: "active",
      images: [{ url: "https://ik.imagekit.io/test/polo.jpg" }],
    });
    await ProductVariant.create({ product: p._id, sku: "P-1", price: 500, stock: 5 });

    const rCustom = await request(app)
      .post("/api/admin/notifications")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Custom Wins",
        channel: "app",
        link: "/product/polo",
        imageUrl: "https://cdn.example.com/custom.png",
        sendNow: true,
      });
    expect(rCustom.status).toBe(201);
    expect(rCustom.body.notification.imageUrl).toBe("https://cdn.example.com/custom.png");
    expect(mockCtrl.state.sendCalls[0].notification.imageUrl).toBe(
      "https://cdn.example.com/custom.png"
    );

    const rNone = await request(app)
      .post("/api/admin/notifications")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "No Auto",
        channel: "app",
        link: "/product/polo",
        autoImage: false,
        sendNow: true,
      });
    expect(rNone.status).toBe(201);
    expect(rNone.body.notification.imageUrl).toBe("");
    expect(mockCtrl.state.sendCalls[1].notification.imageUrl).toBeUndefined();

    const rBad = await request(app)
      .post("/api/admin/notifications")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Bad Img",
        channel: "app",
        imageUrl: "http://example.com/bad.jpg",
        sendNow: true,
      });
    expect(rBad.status).toBe(400);
    expect(mockCtrl.mocks.sendMock).toHaveBeenCalledTimes(2);
  });

  it("resolves scheduled notification image at send time (picks up updated product image)", async () => {
    useFakeClock("2026-11-27T10:00:00.000Z");
    startNotificationScheduler();
    const tick = mockCtrl.state.cronJobs[0].cb;

    const cat = await Category.create({ name: "Bags", slug: "bags" });
    const prod = await Product.create({
      name: "Backpack",
      slug: "backpack",
      category: cat._id,
      brand: brand._id,
      status: "active",
      images: [{ url: "https://ik.imagekit.io/test/bag-old.jpg" }],
    });

    const schedAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    const res = await request(app)
      .post("/api/admin/notifications")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Bag Promo",
        channel: "app",
        link: "/product/backpack",
        sendNow: false,
        scheduledAt: schedAt,
      });

    expect(res.status).toBe(201);
    expect(res.body.notification.imageUrl).toBe("");

    // Change product image before scheduled time
    await Product.updateOne(
      { _id: prod._id },
      { $set: { images: [{ url: "https://ik.imagekit.io/test/bag-new.jpg" }] } }
    );

    jest.setSystemTime(new Date(Date.now() + 3 * 60 * 1000));
    await tick();

    expect(mockCtrl.mocks.sendMock).toHaveBeenCalledTimes(1);
    expect(mockCtrl.state.sendCalls[0].notification.imageUrl).toBe(
      "https://ik.imagekit.io/test/bag-new.jpg?tr=w-800,h-400,fo-auto,q-70"
    );
    const updated = await Notification.findById(res.body.notification._id).lean();
    expect(updated.imageUrl).toBe("https://ik.imagekit.io/test/bag-new.jpg");
  });

  it("includes images on restock, shipped, and delivered, and sends cleanly when product has no image", async () => {
    const cat = await Category.create({ name: "Caps", slug: "caps" });
    const prodWithImg = await Product.create({
      name: "Blue Cap",
      slug: "blue-cap",
      category: cat._id,
      brand: brand._id,
      status: "active",
      images: [{ url: "https://ik.imagekit.io/test/cap.jpg" }],
    });
    const prodNoImg = await Product.create({
      name: "Plain Cap",
      slug: "plain-cap",
      category: cat._id,
      brand: brand._id,
      status: "active",
      images: [],
    });
    const varCap = await ProductVariant.create({
      product: prodWithImg._id,
      sku: "BC-1",
      price: 300,
      stock: 5,
    });

    const cust = await CustomerProfile.create({ authUserId: "c-auto", isActive: true });
    await DeviceToken.create({ customer: cust._id, token: "tok-auto" });
    await Wishlist.create({ customer: cust._id, products: [prodWithImg._id, prodNoImg._id] });

    // Restock with image
    await notifyRestock(prodWithImg);
    expect(mockCtrl.mocks.sendEachForMulticastMock).toHaveBeenCalledTimes(1);
    expect(mockCtrl.state.multicastCalls[0].notification.imageUrl).toBe(
      "https://ik.imagekit.io/test/cap.jpg?tr=w-800,h-400,fo-auto,q-70"
    );

    // Restock without image -> sends without imageUrl and without error
    await notifyRestock(prodNoImg);
    expect(mockCtrl.mocks.sendEachForMulticastMock).toHaveBeenCalledTimes(2);
    expect(mockCtrl.state.multicastCalls[1].notification.imageUrl).toBeUndefined();
    expect(mockCtrl.state.multicastCalls[1].data.imageUrl).toBe("");

    // Order shipped & delivered -> includes first item image
    const order = await Order.create({
      orderNumber: "ORD-IMG-1",
      customer: cust._id,
      items: [
        {
          product: prodWithImg._id,
          variantId: varCap._id,
          name: "Blue Cap",
          image: "https://ik.imagekit.io/test/cap.jpg",
          quantity: 1,
          unitPrice: 300,
        },
      ],
      shippingAddress: { line1: "1 St", city: "M", postalCode: "400001" },
      subtotal: 300,
      total: 300,
      orderStatus: "packed",
      payment: { status: "paid" },
    });

    const shipRes = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ orderStatus: "shipped" });
    expect(shipRes.status).toBe(200);
    await waitFor(() => {
      expect(mockCtrl.mocks.sendEachForMulticastMock).toHaveBeenCalledTimes(3);
    });
    expect(mockCtrl.state.multicastCalls[2].notification.imageUrl).toBe(
      "https://ik.imagekit.io/test/cap.jpg?tr=w-800,h-400,fo-auto,q-70"
    );

    const delivRes = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ orderStatus: "delivered" });
    expect(delivRes.status).toBe(200);
    await waitFor(() => {
      expect(mockCtrl.mocks.sendEachForMulticastMock).toHaveBeenCalledTimes(4);
    });
    expect(mockCtrl.state.multicastCalls[3].notification.imageUrl).toBe(
      "https://ik.imagekit.io/test/cap.jpg?tr=w-800,h-400,fo-auto,q-70"
    );
  });

  it("sends each customer their own product image when segment personalImage=true", async () => {
    const cat = await Category.create({ name: "Wear", slug: "wear" });
    const p1 = await Product.create({
      name: "Prod One",
      slug: "prod-one",
      category: cat._id,
      brand: brand._id,
      status: "active",
      images: [{ url: "https://ik.imagekit.io/test/p1.jpg" }],
    });
    const v1 = await ProductVariant.create({ product: p1._id, sku: "P1", price: 100, stock: 5 });

    const p2 = await Product.create({
      name: "Prod Two",
      slug: "prod-two",
      category: cat._id,
      brand: brand._id,
      status: "active",
      images: [{ url: "https://ik.imagekit.io/test/p2.jpg" }],
    });
    const v2 = await ProductVariant.create({ product: p2._id, sku: "P2", price: 200, stock: 5 });

    const c1 = await CustomerProfile.create({ authUserId: "pc1", isActive: true });
    const c2 = await CustomerProfile.create({ authUserId: "pc2", isActive: true });
    await DeviceToken.create({ customer: c1._id, token: "tok-pc1" });
    await DeviceToken.create({ customer: c2._id, token: "tok-pc2" });
    await Cart.create({ customer: c1._id, items: [{ variant: v1._id, quantity: 1 }] });
    await Cart.create({ customer: c2._id, items: [{ variant: v2._id, quantity: 1 }] });

    const res = await request(app)
      .post("/api/admin/notifications")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Still want {{product}}?",
        body: "Item ready",
        audience: { type: "segment", segment: "cart" },
        personalImage: true,
        sendNow: true,
      });

    expect(res.status).toBe(201);
    expect(mockCtrl.mocks.sendEachMock).toHaveBeenCalledTimes(1);
    const msgs = mockCtrl.state.sendEachCalls[0];
    expect(msgs).toHaveLength(2);
    const byTok = new Map(msgs.map((m) => [m.token, m]));
    expect(byTok.get("tok-pc1").notification.imageUrl).toBe(
      "https://ik.imagekit.io/test/p1.jpg?tr=w-800,h-400,fo-auto,q-70"
    );
    expect(byTok.get("tok-pc1").notification.title).toBe("Still want Prod One?");
    expect(byTok.get("tok-pc2").notification.imageUrl).toBe(
      "https://ik.imagekit.io/test/p2.jpg?tr=w-800,h-400,fo-auto,q-70"
    );
    expect(byTok.get("tok-pc2").notification.title).toBe("Still want Prod Two?");
  });
});
