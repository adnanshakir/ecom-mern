import mongoose from "mongoose";
import CustomerProfile from "../models/customer/customer.model.js";
import Cart from "../models/customer/cart.model.js";
import Wishlist from "../models/customer/wishlist.model.js";
import Order from "../models/customer/order.model.js";
import Category from "../models/admin/category.model.js";
import ProductVariant from "../models/admin/productVariant.model.js";
import DeviceToken from "../models/DeviceToken.js";

const getEffectivePrice = (v) =>
  typeof v?.salePrice === "number" && v.salePrice > 0 ? v.salePrice : v?.price ?? 0;

async function findCustomerUsersByAuthIds(authIds) {
  const db = mongoose.connection.db;
  if (!db || !authIds.length) return [];
  const objectIds = authIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  return db
    .collection("customerUser")
    .find({
      $or: [{ id: { $in: authIds } }, { _id: { $in: [...authIds, ...objectIds] } }],
    })
    .project({ id: 1, name: 1, banned: 1, deletedAt: 1, isDeleted: 1, createdAt: 1 })
    .toArray();
}

export async function getActiveCustomerMeta(customerIds = null) {
  const query = { isActive: { $ne: false } };
  if (customerIds) {
    const ids = [...customerIds];
    if (!ids.length) return new Map();
    query._id = { $in: ids };
  }

  const profiles = await CustomerProfile.find(query)
    .select("_id authUserId createdAt addresses")
    .lean();

  const authIds = profiles.map((p) => p.authUserId).filter(Boolean);
  const users = await findCustomerUsersByAuthIds(authIds);
  const byAuthId = new Map();
  for (const u of users) {
    if (u.id != null) byAuthId.set(String(u.id), u);
    if (u._id != null) byAuthId.set(String(u._id), u);
  }

  const result = new Map();
  for (const p of profiles) {
    const u = byAuthId.get(String(p.authUserId || ""));
    if (u && (u.banned === true || u.deletedAt || u.isDeleted === true)) {
      continue;
    }
    const defaultAddr = p.addresses?.find((a) => a.isDefault) || p.addresses?.[0];
    const name = u?.name || defaultAddr?.fullName || "";
    result.set(String(p._id), {
      customerId: p._id,
      authUserId: p.authUserId,
      name,
      createdAt: p.createdAt || null,
      userCreatedAt: u?.createdAt || null,
    });
  }
  return result;
}

function mapCartsToAudience(carts, activeMap) {
  const out = [];
  for (const cart of carts) {
    const meta = activeMap.get(String(cart.customer));
    if (!meta) continue;
    const validItems = (cart.items || []).filter((it) => it?.variant && it.variant.product);
    if (!validItems.length) continue;

    const latest = validItems[validItems.length - 1];
    const v = latest.variant;
    const prod = v.product;
    out.push({
      customerId: meta.customerId,
      name: meta.name,
      product: {
        name: prod.name,
        slug: prod.slug,
        image: v.images?.[0]?.url || prod.images?.[0]?.url || "",
        price: getEffectivePrice(v),
      },
      count: validItems.length,
    });
  }
  return out;
}

export async function resolveCartIdleCustomers({ minHours = 24, maxHours = 72 } = {}) {
  const now = Date.now();
  const minCutoff = new Date(now - minHours * 3600 * 1000);
  const maxCutoff = new Date(now - maxHours * 3600 * 1000);

  const carts = await Cart.find({
    "items.0": { $exists: true },
    updatedAt: { $gte: maxCutoff, $lte: minCutoff },
  })
    .populate({
      path: "items.variant",
      select: "price salePrice images product",
      populate: { path: "product", select: "name slug images category" },
    })
    .lean();

  const activeMap = await getActiveCustomerMeta(carts.map((c) => c.customer));
  return mapCartsToAudience(carts, activeMap);
}

async function resolveCartAudience() {
  const carts = await Cart.find({ "items.0": { $exists: true } })
    .populate({
      path: "items.variant",
      select: "price salePrice images product",
      populate: { path: "product", select: "name slug images category" },
    })
    .lean();

  const activeMap = await getActiveCustomerMeta(carts.map((c) => c.customer));
  return mapCartsToAudience(carts, activeMap);
}

async function resolveWishlistAudience() {
  const wishlists = await Wishlist.find({ "products.0": { $exists: true } })
    .populate({ path: "products", select: "name slug images category" })
    .lean();

  const activeMap = await getActiveCustomerMeta(wishlists.map((w) => w.customer));
  const productIds = [];
  for (const w of wishlists) {
    if (!activeMap.has(String(w.customer))) continue;
    for (const p of w.products || []) {
      if (p?._id) productIds.push(p._id);
    }
  }

  const variants = productIds.length
    ? await ProductVariant.find({ product: { $in: productIds } })
        .select("product price salePrice images")
        .lean()
    : [];
  const variantsByProduct = new Map();
  for (const v of variants) {
    const key = String(v.product);
    if (!variantsByProduct.has(key)) variantsByProduct.set(key, []);
    variantsByProduct.get(key).push(v);
  }

  const out = [];
  for (const w of wishlists) {
    const meta = activeMap.get(String(w.customer));
    if (!meta) continue;
    const validProducts = (w.products || []).filter(Boolean);
    if (!validProducts.length) continue;

    const latest = validProducts[validProducts.length - 1];
    const pVariants = variantsByProduct.get(String(latest._id)) || [];
    const price = pVariants.length ? Math.min(...pVariants.map(getEffectivePrice)) : 0;
    const image =
      latest.images?.[0]?.url || pVariants.find((v) => v.images?.[0]?.url)?.images?.[0]?.url || "";

    out.push({
      customerId: meta.customerId,
      name: meta.name,
      product: {
        name: latest.name,
        slug: latest.slug,
        image,
        price,
      },
      count: validProducts.length,
    });
  }
  return out;
}

async function resolveCategoryAudience(categoryId) {
  if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) return [];

  const allCategories = await Category.find().select("_id parent").lean();
  const categoryIdSet = new Set([String(categoryId)]);
  const queue = [String(categoryId)];
  while (queue.length > 0) {
    const pid = queue.shift();
    for (const c of allCategories) {
      if (c.parent && String(c.parent) === pid && !categoryIdSet.has(String(c._id))) {
        categoryIdSet.add(String(c._id));
        queue.push(String(c._id));
      }
    }
  }

  const [carts, wishlists] = await Promise.all([
    Cart.find({ "items.0": { $exists: true } })
      .populate({
        path: "items.variant",
        select: "price salePrice images product",
        populate: { path: "product", select: "name slug images category" },
      })
      .lean(),
    Wishlist.find({ "products.0": { $exists: true } })
      .populate({ path: "products", select: "name slug images category" })
      .lean(),
  ]);

  const candidateIds = new Set([
    ...carts.map((c) => c.customer),
    ...wishlists.map((w) => w.customer),
  ]);
  const activeMap = await getActiveCustomerMeta(candidateIds);

  const wishlistProductIds = [];
  for (const w of wishlists) {
    for (const p of w.products || []) {
      if (p?._id && categoryIdSet.has(String(p.category))) {
        wishlistProductIds.push(p._id);
      }
    }
  }
  const wishlistVariants = wishlistProductIds.length
    ? await ProductVariant.find({ product: { $in: wishlistProductIds } })
        .select("product price salePrice images")
        .lean()
    : [];
  const variantsByProduct = new Map();
  for (const v of wishlistVariants) {
    const key = String(v.product);
    if (!variantsByProduct.has(key)) variantsByProduct.set(key, []);
    variantsByProduct.get(key).push(v);
  }

  const perCustomer = new Map();

  for (const cart of carts) {
    const key = String(cart.customer);
    const meta = activeMap.get(key);
    if (!meta) continue;
    const matched = (cart.items || []).filter(
      (it) => it?.variant?.product && categoryIdSet.has(String(it.variant.product.category))
    );
    if (!matched.length) continue;

    const latest = matched[matched.length - 1];
    const v = latest.variant;
    const prod = v.product;
    const entry = perCustomer.get(key) || {
      meta,
      productIds: new Set(),
      product: null,
      updatedAt: 0,
    };
    for (const it of matched) entry.productIds.add(String(it.variant.product._id));
    const ts = cart.updatedAt ? new Date(cart.updatedAt).getTime() : 0;
    if (!entry.product || ts >= entry.updatedAt) {
      entry.product = {
        name: prod.name,
        slug: prod.slug,
        image: v.images?.[0]?.url || prod.images?.[0]?.url || "",
        price: getEffectivePrice(v),
      };
      entry.updatedAt = ts;
    }
    perCustomer.set(key, entry);
  }

  for (const w of wishlists) {
    const key = String(w.customer);
    const meta = activeMap.get(key);
    if (!meta) continue;
    const matched = (w.products || []).filter(
      (p) => p && categoryIdSet.has(String(p.category))
    );
    if (!matched.length) continue;

    const latest = matched[matched.length - 1];
    const pVariants = variantsByProduct.get(String(latest._id)) || [];
    const price = pVariants.length ? Math.min(...pVariants.map(getEffectivePrice)) : 0;
    const image =
      latest.images?.[0]?.url || pVariants.find((v) => v.images?.[0]?.url)?.images?.[0]?.url || "";

    const entry = perCustomer.get(key) || {
      meta,
      productIds: new Set(),
      product: null,
      updatedAt: 0,
    };
    for (const p of matched) entry.productIds.add(String(p._id));
    const ts = w.updatedAt ? new Date(w.updatedAt).getTime() : 0;
    if (!entry.product || ts > entry.updatedAt) {
      entry.product = {
        name: latest.name,
        slug: latest.slug,
        image,
        price,
      };
      entry.updatedAt = ts;
    }
    perCustomer.set(key, entry);
  }

  return [...perCustomer.values()].map((e) => ({
    customerId: e.meta.customerId,
    name: e.meta.name,
    product: e.product,
    count: e.productIds.size,
  }));
}

async function resolveInactive30dAudience() {
  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const activeMap = await getActiveCustomerMeta();
  if (!activeMap.size) return [];

  const recentOrderCustomers = new Set(
    (await Order.distinct("customer", { createdAt: { $gte: cutoff } })).map(String)
  );

  const db = mongoose.connection.db;
  const recentSessionUserIds = new Set();
  if (db) {
    const sessions = await db
      .collection("customerSession")
      .find({ $or: [{ updatedAt: { $gte: cutoff } }, { createdAt: { $gte: cutoff } }] })
      .project({ userId: 1 })
      .toArray();
    for (const s of sessions) {
      if (s.userId != null) recentSessionUserIds.add(String(s.userId));
    }
  }

  const out = [];
  for (const [idStr, meta] of activeMap.entries()) {
    if (recentOrderCustomers.has(idStr)) continue;
    if (meta.authUserId && recentSessionUserIds.has(String(meta.authUserId))) continue;
    if (meta.userCreatedAt && new Date(meta.userCreatedAt) >= cutoff) continue;
    if (meta.createdAt && new Date(meta.createdAt) >= cutoff) continue;
    out.push({
      customerId: meta.customerId,
      name: meta.name,
      product: null,
      count: 0,
    });
  }
  return out;
}

async function resolveNeverOrderedAudience() {
  const activeMap = await getActiveCustomerMeta();
  if (!activeMap.size) return [];

  const orderedIds = new Set((await Order.distinct("customer")).map(String));
  const out = [];
  for (const [idStr, meta] of activeMap.entries()) {
    if (orderedIds.has(idStr)) continue;
    out.push({
      customerId: meta.customerId,
      name: meta.name,
      product: null,
      count: 0,
    });
  }
  return out;
}

async function resolveBoughtBeforeAudience() {
  const orderedIds = await Order.distinct("customer");
  if (!orderedIds.length) return [];

  const activeMap = await getActiveCustomerMeta(orderedIds);
  return [...activeMap.values()].map((meta) => ({
    customerId: meta.customerId,
    name: meta.name,
    product: null,
    count: 0,
  }));
}

export async function resolveAudience(segment, { categoryId } = {}) {
  switch (segment) {
    case "cart":
      return resolveCartAudience();
    case "wishlist":
      return resolveWishlistAudience();
    case "category":
      return resolveCategoryAudience(categoryId);
    case "inactive_30d":
      return resolveInactive30dAudience();
    case "never_ordered":
      return resolveNeverOrderedAudience();
    case "bought_before":
      return resolveBoughtBeforeAudience();
    default:
      return [];
  }
}

export async function countAudience(segment, opts = {}) {
  const people = await resolveAudience(segment, opts);
  if (!people.length) return { total: 0, withApp: 0 };
  const ids = people.map((p) => p.customerId);
  const withDeviceIds = await DeviceToken.distinct("customer", { customer: { $in: ids } });
  return { total: people.length, withApp: withDeviceIds.length };
}

export default {
  resolveAudience,
  countAudience,
  resolveCartIdleCustomers,
  getActiveCustomerMeta,
};
