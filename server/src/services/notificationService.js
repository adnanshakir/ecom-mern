import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import cron from "node-cron";
import Notification from "../models/Notification.js";
import NotificationTemplate from "../models/NotificationTemplate.js";
import NotificationLog from "../models/NotificationLog.js";
import DeviceToken from "../models/DeviceToken.js";
import Product from "../models/admin/product.model.js";
import ProductVariant from "../models/admin/productVariant.model.js";
import Category from "../models/admin/category.model.js";
import { resolveAudience, resolveCartIdleCustomers } from "./notificationAudience.js";

const CLAIM_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MARKETING_CAP_HOURS = 24;

const allowlist = () =>
  (process.env.PUSH_ALLOWLIST_CUSTOMER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export const filterAllowed = (customerIds) => {
  const a = allowlist();
  return a.length ? customerIds.filter((id) => a.includes(String(id))) : customerIds;
};

if (!getApps().length) {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!b64) {
    console.error("[firebase] NOT configured: FIREBASE_SERVICE_ACCOUNT_B64 is missing");
  } else {
    try {
      const json = Buffer.from(b64.trim(), "base64").toString("utf8");
      initializeApp({ credential: cert(JSON.parse(json)) });
      console.log("[firebase] initialized");
    } catch (e) {
      console.error("[firebase] init failed:", e.message);
    }
  }
}

const pushEnabled = () => getApps().length > 0;
const pushStubEnabled = () =>
  process.env.NODE_ENV !== "production" && process.env.ENABLE_PUSH_STUB === "true";

const isHttpsUrl = (u) => typeof u === "string" && /^https:\/\//i.test(u.trim());

// ImageKit resize so push images stay small; non-ImageKit https URLs pass through unchanged
export const pushImage = (url) => {
  if (typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed || !/^https:\/\//i.test(trimmed)) return "";
  const endpoint = (process.env.IMAGEKIT_URL_ENDPOINT || "").trim().replace(/\/+$/, "");
  if (endpoint && trimmed.startsWith(endpoint)) {
    return `${trimmed}${trimmed.includes("?") ? "&" : "?"}tr=w-800,h-400,fo-auto,q-70`;
  }
  return trimmed;
};

// Returns an https image URL for /product/<slug> or /category/<slug>, or "" (never throws)
export async function resolveAutoImage(link) {
  try {
    if (typeof link !== "string") return "";
    const pathOnly = link.trim().split(/[?#]/)[0].replace(/\/+$/, "");
    if (!pathOnly) return "";

    const prodMatch = /^\/product\/([^/]+)$/i.exec(pathOnly);
    if (prodMatch) {
      const slug = decodeURIComponent(prodMatch[1]).toLowerCase();
      const product = await Product.findOne({ slug, status: "active" }).select("_id images").lean();
      if (!product) return "";
      const prodImg = (product.images || []).find((img) => isHttpsUrl(img?.url))?.url;
      if (prodImg) return prodImg.trim();

      const variants = await ProductVariant.find({
        product: product._id,
        isActive: { $ne: false },
      })
        .select("images")
        .lean();
      for (const v of variants) {
        const varImg = (v.images || []).find((img) => isHttpsUrl(img?.url))?.url;
        if (varImg) return varImg.trim();
      }
      return "";
    }

    const catMatch = /^\/category\/([^/]+)$/i.exec(pathOnly);
    if (catMatch) {
      const slug = decodeURIComponent(catMatch[1]).toLowerCase();
      const category = await Category.findOne({ slug, isActive: { $ne: false } })
        .select("_id image")
        .lean();
      if (!category) return "";
      if (isHttpsUrl(category.image?.url)) return category.image.url.trim();

      const allCategories = await Category.find({ isActive: { $ne: false } })
        .select("_id parent")
        .lean();
      const categoryIds = [category._id];
      const seen = new Set([String(category._id)]);
      const queue = [String(category._id)];
      while (queue.length > 0) {
        const pid = queue.shift();
        for (const c of allCategories) {
          if (c.parent && String(c.parent) === pid && !seen.has(String(c._id))) {
            seen.add(String(c._id));
            categoryIds.push(c._id);
            queue.push(String(c._id));
          }
        }
      }

      const products = await Product.find({
        category: { $in: categoryIds },
        status: "active",
      })
        .select("_id images")
        .lean();
      if (!products.length) return "";

      const productIds = products.map((p) => p._id);
      const variants = await ProductVariant.find({
        product: { $in: productIds },
        isActive: { $ne: false },
      })
        .select("product stock images")
        .lean();

      const stockByProduct = new Map();
      const variantImgByProduct = new Map();
      for (const v of variants) {
        const pid = String(v.product);
        stockByProduct.set(pid, (stockByProduct.get(pid) || 0) + (v.stock || 0));
        if (!variantImgByProduct.has(pid)) {
          const vImg = (v.images || []).find((img) => isHttpsUrl(img?.url))?.url;
          if (vImg) variantImgByProduct.set(pid, vImg.trim());
        }
      }

      let bestImg = "";
      let bestStock = -1;
      for (const p of products) {
        const pid = String(p._id);
        const img =
          (p.images || []).find((i) => isHttpsUrl(i?.url))?.url?.trim() ||
          variantImgByProduct.get(pid) ||
          "";
        if (!img) continue;
        const totalStock = stockByProduct.get(pid) ?? 0;
        if (totalStock > bestStock) {
          bestStock = totalStock;
          bestImg = img;
        }
      }
      return bestImg;
    }

    return "";
  } catch {
    return "";
  }
}

// Resolves an https image URL for the first item in an order (never throws)
export async function resolveOrderItemImage(order) {
  try {
    const firstItem = order?.items?.[0];
    if (!firstItem) return "";
    if (isHttpsUrl(firstItem.image)) return firstItem.image.trim();

    let productId = firstItem.product;
    if (firstItem.variantId) {
      const variant = await ProductVariant.findById(firstItem.variantId)
        .select("images product")
        .lean();
      const varImg = (variant?.images || []).find((i) => isHttpsUrl(i?.url))?.url;
      if (varImg) return varImg.trim();
      if (!productId && variant?.product) productId = variant.product;
    }
    if (productId) {
      const product = await Product.findById(productId).select("_id images").lean();
      if (product) {
        const prodImg = (product.images || []).find((i) => isHttpsUrl(i?.url))?.url;
        if (prodImg) return prodImg.trim();
        const variants = await ProductVariant.find({
          product: product._id,
          isActive: { $ne: false },
        })
          .select("images")
          .lean();
        for (const v of variants) {
          const vImg = (v.images || []).find((i) => isHttpsUrl(i?.url))?.url;
          if (vImg) return vImg.trim();
        }
      }
    }
    return "";
  } catch {
    return "";
  }
}

const fill = (tpl, vars = {}) =>
  (tpl || "").replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : ""));

const buildMessage = ({ title, body, link, imageUrl }) => {
  const img = imageUrl && /^https:\/\//i.test(imageUrl) ? imageUrl : undefined;
  return {
    notification: { title, ...(body ? { body } : {}), ...(img ? { imageUrl: img } : {}) },
    data: { link: link != null ? String(link) : "", imageUrl: img || "" }, // all values must be strings
    android: {
      priority: "high",
      notification: {
        channelId: "fibio_default",
        sound: "default",
        ...(img ? { imageUrl: img } : {}),
      },
    },
    apns: {
      payload: { aps: { sound: "default", mutableContent: true } },
      ...(img ? { fcmOptions: { imageUrl: img } } : {}),
    },
  };
};

function isRetryableFcmError(error) {
  if (!error) return false;
  const code = error.code || "";
  const msg = error.message || "";
  return (
    code === "messaging/server-unavailable" ||
    code === "messaging/internal-error" ||
    code === "messaging/quota-exceeded" ||
    code === "messaging/device-message-rate-exceeded" ||
    code === "messaging/unavailable" ||
    /unavailable|timeout|rate-limit|rate_limit|quota|internal/i.test(code) ||
    /unavailable|timeout|rate limit|quota/i.test(msg)
  );
}

function isInvalidOrUnregisteredTokenError(error) {
  if (!error) return false;
  const code = error.code || "";
  return (
    code === "messaging/registration-token-not-registered" ||
    code === "messaging/invalid-registration-token"
  );
}

// items: [{ customerId, title, body, link, imageUrl }]
// Removes customers who were messaged too recently
export async function applyCooldown(items, { key, cooldownHours, marketing = true }) {
  if (!items.length) return [];
  const ids = items.map((i) => i.customerId);
  const windowHours = Math.max(cooldownHours, marketing ? MARKETING_CAP_HOURS : 0);
  const logs = await NotificationLog.find({
    customer: { $in: ids },
    sentAt: { $gte: new Date(Date.now() - windowHours * 3600 * 1000) },
  })
    .select("customer key marketing sentAt")
    .lean();

  const blocked = new Set();
  for (const l of logs) {
    const ageH = (Date.now() - new Date(l.sentAt).getTime()) / 3600000;
    if (marketing && l.marketing && ageH < MARKETING_CAP_HOURS) blocked.add(String(l.customer));
    if (l.key === key && ageH < cooldownHours) blocked.add(String(l.customer));
  }
  return items.filter((i) => !blocked.has(String(i.customerId)));
}

// Sends a different message to each customer's devices
export async function sendPersonalBatch(items, { key, marketing = true }) {
  const allowedIds = new Set(filterAllowed(items.map((i) => String(i.customerId))).map(String));
  const allowedItems = items.filter((i) => allowedIds.has(String(i.customerId)));
  const skipped = items.length - allowedItems.length;
  if (skipped > 0) {
    console.log("[allowlist] skipped", skipped, "customers in batch", key);
  }
  if (!allowedItems.length) return { targeted: 0, withDevice: 0, delivered: 0, failed: 0 };
  if (!pushEnabled()) {
    if (pushStubEnabled()) {
      console.log("[push stub:batch]", key, allowedItems.length, "customers");
      return {
        targeted: allowedItems.length,
        withDevice: allowedItems.length,
        delivered: allowedItems.length,
        failed: 0,
      };
    }
    throw new Error("Push notifications disabled: Firebase is not configured");
  }

  const tokenDocs = await DeviceToken.find({
    customer: { $in: allowedItems.map((i) => i.customerId) },
  }).lean();
  const byCustomer = new Map();
  for (const d of tokenDocs) {
    const k = String(d.customer);
    if (!byCustomer.has(k)) byCustomer.set(k, []);
    byCustomer.get(k).push(d.token);
  }

  const messages = [];
  const owners = [];
  for (const it of allowedItems) {
    for (const token of byCustomer.get(String(it.customerId)) || []) {
      messages.push({ token, ...buildMessage(it) });
      owners.push(String(it.customerId));
    }
  }

  let delivered = 0,
    failed = 0;
  const bad = [];
  const reached = new Set();
  let sendError = null;
  try {
    for (let i = 0; i < messages.length; i += 500) {
      const res = await getMessaging().sendEach(messages.slice(i, i + 500));
      res.responses.forEach((r, j) => {
        if (r.success) {
          delivered++;
          reached.add(owners[i + j]);
        } else {
          failed++;
          if (isInvalidOrUnregisteredTokenError(r.error)) bad.push(messages[i + j].token);
        }
      });
    }
  } catch (err) {
    sendError = err;
  }

  try {
    if (bad.length) await DeviceToken.deleteMany({ token: { $in: bad } });
    if (reached.size) {
      await NotificationLog.insertMany(
        [...reached].map((id) => ({ customer: id, key, marketing, sentAt: new Date() }))
      );
    }
  } catch (cleanupErr) {
    if (sendError) {
      console.error("sendPersonalBatch cleanup error after send failure:", cleanupErr);
    } else {
      throw cleanupErr;
    }
  }

  if (sendError) throw sendError;
  return { targeted: allowedItems.length, withDevice: new Set(owners).size, delivered, failed };
}

// Broadcast to every app install (apps subscribe to topic "all")
async function sendToTopic(n) {
  if (!pushEnabled()) {
    if (pushStubEnabled()) {
      console.log("[push stub:topic]", n.title, "|", n.body);
      return { ok: true, stub: true };
    }
    throw new Error("Push notifications disabled: Firebase is not configured");
  }
  const plain = n.toObject ? n.toObject() : n;
  await getMessaging().send({
    topic: "all",
    ...buildMessage({ ...plain, imageUrl: pushImage(plain.imageUrl) }),
  });
  return { ok: true };
}

// Personal push to one customer's devices
async function sendToCustomer(customerId, n) {
  const list = allowlist();
  if (list.length && !list.includes(String(customerId))) {
    console.log("[allowlist] skipped", String(customerId));
    return;
  }
  const docs = await DeviceToken.find({ customer: customerId }).lean();
  const tokens = docs.map((d) => d.token);
  if (!tokens.length) return;
  if (!pushEnabled()) {
    if (pushStubEnabled()) {
      console.log("[push stub:customer]", String(customerId), n.title, "|", n.body);
      return { ok: true, stub: true };
    }
    throw new Error("Push notifications disabled: Firebase is not configured");
  }

  const message = buildMessage(n);
  const res = await getMessaging().sendEachForMulticast({ tokens, ...message });

  const badTokens = [];
  const retryTokens = [];
  const failures = [];

  res.responses.forEach((r, i) => {
    if (r.success) return;
    const token = tokens[i];
    if (isInvalidOrUnregisteredTokenError(r.error)) {
      badTokens.push(token);
    } else if (isRetryableFcmError(r.error)) {
      retryTokens.push(token);
    } else {
      failures.push({ token, error: r.error });
    }
  });

  if (badTokens.length) {
    await DeviceToken.deleteMany({ token: { $in: badTokens } });
  }

  // Retry only recipients classified as retryable while leaving successful recipients untouched
  if (retryTokens.length > 0) {
    try {
      const retryRes = await getMessaging().sendEachForMulticast({
        tokens: retryTokens,
        ...message,
      });
      const retryBadTokens = [];
      retryRes.responses.forEach((r, i) => {
        if (r.success) return;
        const token = retryTokens[i];
        if (isInvalidOrUnregisteredTokenError(r.error)) {
          retryBadTokens.push(token);
        } else {
          failures.push({ token, error: r.error });
        }
      });
      if (retryBadTokens.length) {
        await DeviceToken.deleteMany({ token: { $in: retryBadTokens } });
      }
    } catch (retryErr) {
      retryTokens.forEach((token) => failures.push({ token, error: retryErr }));
    }
  }

  if (failures.length > 0) {
    const errorMessages = failures
      .map((f) => f.error?.message || f.error?.code || "Unknown error")
      .join("; ");
    const err = new Error(`Customer push notification partially or fully failed: ${errorMessages}`);
    err.failures = failures;
    throw err;
  }
}

async function sendTemplateToCustomer(key, customerId, vars = {}) {
  const t = await NotificationTemplate.findOne({ key }).lean();
  if (!t || t.enabled === false) return;
  await sendToCustomer(customerId, {
    title: fill(t.titleTpl, vars),
    body: fill(t.bodyTpl, vars),
    link: vars.link || "",
    imageUrl: vars.imageUrl ? pushImage(vars.imageUrl) : "",
  });
}

// Send a Notification document now (app push and/or start web ticker, or segmented personal batch)
async function dispatch(n, preResolvedPeople = null) {
  const target = await Notification.findOneAndUpdate(
    {
      _id: n._id,
      status: { $in: ["scheduled", "sending"] },
      dispatchLock: { $ne: true },
    },
    {
      $set: {
        status: "sending",
        dispatchLock: true,
        claimExpiresAt: new Date(Date.now() + CLAIM_TIMEOUT_MS),
      },
    },
    { returnDocument: "after" }
  );
  if (!target) {
    return (await Notification.findById(n._id)) || n;
  }

  try {
    const customImage = (target.imageUrl || "").trim();
    const autoImg =
      !customImage && target.autoImage !== false && target.link
        ? await resolveAutoImage(target.link)
        : "";

    if (target.audience?.type === "segment") {
      const people =
        preResolvedPeople ||
        (await resolveAudience(target.audience.segment, {
          categoryId: target.audience.categoryId,
        }));
      const items = people.map((p) => {
        const vars = {
          name: p.name || "there",
          product: p.product?.name || "",
          count: p.count ?? 0,
        };
        let chosenImage = "";
        if (customImage) {
          chosenImage = pushImage(customImage);
        } else if (target.personalImage && p.product?.image) {
          chosenImage = pushImage(p.product.image);
        } else if (autoImg) {
          chosenImage = pushImage(autoImg);
        }
        return {
          customerId: p.customerId,
          title: fill(target.title, vars),
          body: fill(target.body, vars),
          link: target.link || (p.product?.slug ? `/product/${p.product.slug}` : ""),
          imageUrl: chosenImage,
        };
      });
      if (!customImage && autoImg && !target.personalImage) {
        target.imageUrl = autoImg;
      }
      const stats = await sendPersonalBatch(items, { key: "campaign", marketing: true });
      target.stats = stats;
      if (stats.withDevice === 0) {
        throw new Error("No customers in this audience have the app installed");
      }
      target.sentAt = new Date();
      target.status = "sent";
      target.claimExpiresAt = undefined;
      target.dispatchLock = false;
      target.result = { ok: true };
    } else {
      if (!customImage && autoImg) {
        target.imageUrl = autoImg;
      }
      if (target.channel === "app" || target.channel === "both") await sendToTopic(target);
      target.sentAt = new Date();
      if (target.channel === "web" || target.channel === "both") {
        target.tickerEndsAt = new Date(
          Date.now() + (target.tickerDurationHours || 24) * 3600 * 1000
        );
      }
      target.status = "sent";
      target.claimExpiresAt = undefined;
      target.dispatchLock = false;
      target.result = { ok: true };
    }
  } catch (e) {
    target.status = "failed";
    target.claimExpiresAt = undefined;
    target.dispatchLock = false;
    target.result = {
      ok: false,
      error: String(e?.message || "Unknown error").slice(0, 300),
    };
  }
  await target.save();
  return target;
}

const istHour = () => {
  const h = Number(
    new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Kolkata",
    }).format(new Date())
  );
  return h === 24 ? 0 : h;
};

export async function runCartReminders() {
  const t = await NotificationTemplate.findOne({ key: "cart_reminder" }).lean();
  if (!t || t.enabled === false) return;
  const people = await resolveCartIdleCustomers({ minHours: 24, maxHours: 72 });
  let items = people
    .filter((p) => p.product)
    .map((p) => ({
      customerId: p.customerId,
      title: fill(t.titleTpl, {}),
      body: fill(t.bodyTpl, {
        product: p.product.name,
        more: p.count > 1 ? ` and ${p.count - 1} more` : "",
      }),
      link: "/cart",
      imageUrl: pushImage(p.product.image),
    }));
  items = await applyCooldown(items, { key: "cart_reminder", cooldownHours: 72 });
  await sendPersonalBatch(items, { key: "cart_reminder" });
}

function startNotificationScheduler() {
  if (process.env.DISABLE_SCHEDULER === "true") {
    console.log("[scheduler] disabled");
    return;
  }
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      // 1. Due scheduled notifications
      const due = await Notification.find({
        status: "scheduled",
        scheduledAt: { $lte: now },
      }).limit(20);
      for (const n of due) {
        const claimExpiresAt = new Date(Date.now() + CLAIM_TIMEOUT_MS);
        // atomic claim so two server instances never double-send
        const claimed = await Notification.findOneAndUpdate(
          { _id: n._id, status: "scheduled" },
          { status: "sending", claimExpiresAt },
          { returnDocument: "after" }
        );
        if (claimed) await dispatch(claimed);
      }

      // 2. Reclaim expired sending claims
      const expiredSending = await Notification.find({
        status: "sending",
        claimExpiresAt: { $lte: now },
      }).limit(20);

      for (const exp of expiredSending) {
        const claimExpiresAt = new Date(Date.now() + CLAIM_TIMEOUT_MS);
        const claimedExpired = await Notification.findOneAndUpdate(
          { _id: exp._id, status: "sending", claimExpiresAt: { $lte: now } },
          { claimExpiresAt, dispatchLock: false },
          { returnDocument: "after" }
        );
        if (!claimedExpired) continue;

        // Account for whether the provider may already have accepted the send
        if (claimedExpired.sentAt) {
          claimedExpired.status = "sent";
          claimedExpired.claimExpiresAt = undefined;
          claimedExpired.dispatchLock = false;
          claimedExpired.result = claimedExpired.result || { ok: true };
          await claimedExpired.save();
          continue;
        }

        if (claimedExpired.channel === "app" || claimedExpired.channel === "both") {
          claimedExpired.status = "failed";
          claimedExpired.claimExpiresAt = undefined;
          claimedExpired.dispatchLock = false;
          claimedExpired.result = {
            ok: false,
            error:
              "Claim expired with unknown provider delivery outcome; delivery aborted to prevent duplicates",
          };
          await claimedExpired.save();
        } else {
          await dispatch(claimedExpired);
        }
      }
    } catch (e) {
      console.error("notification scheduler error:", e.message);
    }
  });

  cron.schedule(
    "0 * * * *",
    async () => {
      try {
        const h = istHour();
        if (h < 10 || h >= 20) return;
        await runCartReminders();
      } catch (e) {
        console.error("cart reminder job error:", e.message);
      }
    },
    { timezone: "Asia/Kolkata" }
  );
}

export {
  CLAIM_TIMEOUT_MS,
  MARKETING_CAP_HOURS,
  fill,
  buildMessage,
  isRetryableFcmError,
  isInvalidOrUnregisteredTokenError,
  istHour,
  pushEnabled,
  pushStubEnabled,
  sendToTopic,
  sendToCustomer,
  sendTemplateToCustomer,
  dispatch,
  startNotificationScheduler,
};
export default {
  CLAIM_TIMEOUT_MS,
  MARKETING_CAP_HOURS,
  fill,
  buildMessage,
  isRetryableFcmError,
  isInvalidOrUnregisteredTokenError,
  istHour,
  pushEnabled,
  pushStubEnabled,
  pushImage,
  resolveAutoImage,
  resolveOrderItemImage,
  filterAllowed,
  applyCooldown,
  sendPersonalBatch,
  runCartReminders,
  sendToTopic,
  sendToCustomer,
  sendTemplateToCustomer,
  dispatch,
  startNotificationScheduler,
};
