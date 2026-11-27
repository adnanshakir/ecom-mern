import Wishlist from "../models/customer/wishlist.model.js";
import Cart from "../models/customer/cart.model.js";
import ProductVariant from "../models/admin/productVariant.model.js";
import NotificationTemplate from "../models/NotificationTemplate.js";
import {
  sendTemplateToCustomer,
  fill,
  pushImage,
  applyCooldown,
  sendPersonalBatch,
} from "./notificationService.js";
import { getActiveCustomerMeta } from "./notificationAudience.js";

const formatInrNoDecimals = (amount) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(amount));

export const getEffectiveVariantPrice = (variant) =>
  typeof variant?.salePrice === "number" && variant.salePrice > 0
    ? variant.salePrice
    : (variant?.price ?? 0);

export const getProductMinEffectivePrice = (variants = []) => {
  if (!variants.length) return 0;
  return Math.min(...variants.map(getEffectiveVariantPrice));
};

export async function notifyRestock(product) {
  const t = await NotificationTemplate.findOne({ key: "restock" }).lean();
  if (!t || t.enabled === false) return;

  let rawImage = product.images?.[0]?.url || "";
  if (!rawImage) {
    const variants = await ProductVariant.find({
      product: product._id,
      isActive: { $ne: false },
    })
      .select("images")
      .lean();
    rawImage = variants.find((v) => v.images?.[0]?.url)?.images?.[0]?.url || "";
  }

  const wishlists = await Wishlist.find({ products: product._id }).select("customer").lean();
  await Promise.allSettled(
    wishlists.map((w) =>
      sendTemplateToCustomer("restock", w.customer, {
        product: product.name,
        link: `/product/${product.slug}`,
        imageUrl: rawImage,
      })
    )
  );
}

export async function notifyPriceDrop(product, oldPrice, newPrice, variantId = null) {
  if (
    !product ||
    !Number.isFinite(oldPrice) ||
    !Number.isFinite(newPrice) ||
    oldPrice <= 0 ||
    newPrice > oldPrice * 0.95
  ) {
    return;
  }

  const t = await NotificationTemplate.findOne({ key: "price_drop" }).lean();
  if (!t || t.enabled === false) return;

  const variants = await ProductVariant.find({ product: product._id })
    .select("_id images price salePrice")
    .lean();
  const variantIds = variants.map((v) => v._id);

  const [carts, wishlists] = await Promise.all([
    variantId
      ? Cart.find({ "items.variant": variantId }).select("customer").lean()
      : variantIds.length
        ? Cart.find({ "items.variant": { $in: variantIds } })
            .select("customer")
            .lean()
        : [],
    Wishlist.find({ products: product._id }).select("customer").lean(),
  ]);

  const cartCustomerIds = new Set(carts.map((c) => String(c.customer)));
  const wishlistCustomerIds = new Set(wishlists.map((w) => String(w.customer)));

  // Wishlist is product-level, so use the product's minimum effective variant price
  let wishlistOldPrice = oldPrice;
  let wishlistNewPrice = newPrice;
  let notifyWishlist = wishlistCustomerIds.size > 0;
  if (variantId && notifyWishlist) {
    if (!variants.length) {
      notifyWishlist = false;
    } else {
      const targetIdStr = String(variantId);
      wishlistOldPrice = Math.min(
        ...variants.map((v) =>
          String(v._id) === targetIdStr ? oldPrice : getEffectiveVariantPrice(v)
        )
      );
      wishlistNewPrice = Math.min(
        ...variants.map((v) =>
          String(v._id) === targetIdStr ? newPrice : getEffectiveVariantPrice(v)
        )
      );
      notifyWishlist = wishlistOldPrice > 0 && wishlistNewPrice <= wishlistOldPrice * 0.95;
    }
  }

  const candidateIds = new Set([
    ...carts.map((c) => c.customer),
    ...(notifyWishlist ? wishlists.map((w) => w.customer) : []),
  ]);
  if (!candidateIds.size) return;

  const activeMap = await getActiveCustomerMeta(candidateIds);
  if (!activeMap.size) return;

  const targetVariant = variantId
    ? variants.find((v) => String(v._id) === String(variantId))
    : null;
  const fallbackVariantImg = variants.find((v) => v.images?.[0]?.url)?.images?.[0]?.url || "";
  const productFirstImg = product.images?.[0]?.url || "";
  const cartRawImage = targetVariant?.images?.[0]?.url || productFirstImg || fallbackVariantImg;
  const wishlistRawImage = productFirstImg || targetVariant?.images?.[0]?.url || fallbackVariantImg;
  const cartImageUrl = pushImage(cartRawImage);
  const wishlistImageUrl = pushImage(wishlistRawImage);
  const link = `/product/${product.slug}`;

  const buildMsg = (fromPrice, toPrice) => {
    const vars = {
      product: product.name,
      price: formatInrNoDecimals(toPrice),
      oldPrice: formatInrNoDecimals(fromPrice),
    };
    return {
      title: fill(t.titleTpl, vars),
      body: fill(t.bodyTpl, vars),
    };
  };

  const cartMsg = buildMsg(oldPrice, newPrice);
  const wishlistMsg =
    wishlistOldPrice === oldPrice && wishlistNewPrice === newPrice
      ? cartMsg
      : buildMsg(wishlistOldPrice, wishlistNewPrice);

  let items = [...activeMap.values()].map((meta) => {
    const inCart = cartCustomerIds.has(String(meta.customerId));
    const msg = inCart ? cartMsg : wishlistMsg;
    return {
      customerId: meta.customerId,
      title: msg.title,
      body: msg.body,
      link,
      imageUrl: inCart ? cartImageUrl : wishlistImageUrl,
    };
  });

  items = await applyCooldown(items, { key: "price_drop", cooldownHours: 168 });
  await sendPersonalBatch(items, { key: "price_drop" });
}

export async function notifyPriceDropsBulk(drops = []) {
  if (!Array.isArray(drops) || !drops.length) return;

  const t = await NotificationTemplate.findOne({ key: "price_drop" }).lean();
  if (!t || t.enabled === false) return;

  const validDrops = [];
  const seenProducts = new Map();
  for (const d of drops) {
    if (
      !d ||
      !d.productId ||
      !Number.isFinite(d.oldPrice) ||
      !Number.isFinite(d.newPrice) ||
      d.oldPrice <= 0 ||
      d.newPrice > d.oldPrice * 0.95
    ) {
      continue;
    }
    const dropPct = (d.oldPrice - d.newPrice) / d.oldPrice;
    const pid = String(d.productId);
    const existing = seenProducts.get(pid);
    if (!existing || dropPct > existing.dropPct) {
      seenProducts.set(pid, { ...d, dropPct });
    }
  }

  validDrops.push(...seenProducts.values());
  if (!validDrops.length) return;

  validDrops.sort((a, b) => b.dropPct - a.dropPct);
  const cappedDrops = validDrops.slice(0, 100);
  const dropByProductId = new Map(cappedDrops.map((d) => [String(d.productId), d]));
  const productIds = cappedDrops.map((d) => d.productId);

  const variants = await ProductVariant.find({ product: { $in: productIds } })
    .select("_id product images")
    .lean();

  const variantToProduct = new Map();
  const fallbackImageByProduct = new Map();
  const variantIds = [];
  for (const v of variants) {
    variantIds.push(v._id);
    const pid = String(v.product);
    variantToProduct.set(String(v._id), pid);
    if (!fallbackImageByProduct.has(pid) && v.images?.[0]?.url) {
      fallbackImageByProduct.set(pid, v.images[0].url);
    }
  }

  const [carts, wishlists] = await Promise.all([
    variantIds.length
      ? Cart.find({ "items.variant": { $in: variantIds } })
          .select("customer items.variant")
          .lean()
      : [],
    Wishlist.find({ products: { $in: productIds } })
      .select("customer products")
      .lean(),
  ]);

  const candidateIds = new Set([
    ...carts.map((c) => c.customer),
    ...wishlists.map((w) => w.customer),
  ]);
  if (!candidateIds.size) return;

  const activeMap = await getActiveCustomerMeta(candidateIds);
  if (!activeMap.size) return;

  const byCustomer = new Map();
  const addCustomerDrop = (customerId, pid, source) => {
    const cKey = String(customerId);
    const meta = activeMap.get(cKey);
    if (!meta) return;
    const drop = dropByProductId.get(pid);
    if (!drop) return;

    if (!byCustomer.has(cKey)) {
      byCustomer.set(cKey, { customerId: meta.customerId, drops: new Map() });
    }
    const custDrops = byCustomer.get(cKey).drops;
    if (!custDrops.has(pid)) {
      custDrops.set(pid, { drop, fromWishlist: false, fromCart: false });
    }
    const entry = custDrops.get(pid);
    if (source === "wishlist") entry.fromWishlist = true;
    if (source === "cart") entry.fromCart = true;
  };

  for (const cart of carts) {
    for (const it of cart.items || []) {
      const pid = variantToProduct.get(String(it.variant));
      if (pid) addCustomerDrop(cart.customer, pid, "cart");
    }
  }

  for (const w of wishlists) {
    for (const p of w.products || []) {
      addCustomerDrop(w.customer, String(p), "wishlist");
    }
  }

  if (!byCustomer.size) return;

  let items = [];
  for (const { customerId, drops: custDropMap } of byCustomer.values()) {
    const entries = [...custDropMap.values()].sort((a, b) => b.drop.dropPct - a.drop.dropPct);
    if (!entries.length) continue;

    if (entries.length === 1) {
      const { drop } = entries[0];
      const rawImage = drop.image || fallbackImageByProduct.get(String(drop.productId)) || "";
      const vars = {
        product: drop.name,
        price: formatInrNoDecimals(drop.newPrice),
        oldPrice: formatInrNoDecimals(drop.oldPrice),
      };
      items.push({
        customerId,
        title: fill(t.titleTpl, vars),
        body: fill(t.bodyTpl, vars),
        link: `/product/${drop.slug}`,
        imageUrl: pushImage(rawImage),
      });
    } else {
      const biggest = entries[0].drop;
      const anyFromWishlist = entries.some((e) => e.fromWishlist);
      const rawImage = biggest.image || fallbackImageByProduct.get(String(biggest.productId)) || "";
      items.push({
        customerId,
        title: "📉 Prices dropped on items you like",
        body: fill("{{product}} and {{n}} more are cheaper now.", {
          product: biggest.name,
          n: entries.length - 1,
        }),
        link: anyFromWishlist ? "/wishlist" : "/cart",
        imageUrl: pushImage(rawImage),
      });
    }
  }

  items = await applyCooldown(items, { key: "price_drop", cooldownHours: 168 });
  await sendPersonalBatch(items, { key: "price_drop" });
}

export default {
  notifyRestock,
  notifyPriceDrop,
  notifyPriceDropsBulk,
  getEffectiveVariantPrice,
  getProductMinEffectivePrice,
};
