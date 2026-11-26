import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import cron from "node-cron";
import Notification from "../models/Notification.js";
import NotificationTemplate from "../models/NotificationTemplate.js";
import NotificationLog from "../models/NotificationLog.js";
import DeviceToken from "../models/DeviceToken.js";
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

// ImageKit resize so push images stay small
export const pushImage = (url) =>
  url ? `${url}${url.includes("?") ? "&" : "?"}tr=w-800,h-400,fo-auto,q-70` : "";

const fill = (tpl, vars = {}) =>
  (tpl || "").replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : ""));

const buildMessage = ({ title, body, link, imageUrl }) => {
  const img = imageUrl && /^https:\/\//.test(imageUrl) ? imageUrl : undefined;
  return {
    notification: { title, ...(body ? { body } : {}), ...(img ? { imageUrl: img } : {}) },
    data: { link: link || "", imageUrl: img || "" }, // all values must be strings
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
  await getMessaging().send({ topic: "all", ...buildMessage(n) });
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
  });
}

// Send a Notification document now (app push and/or start web ticker, or segmented personal batch)
async function dispatch(n, preResolvedPeople = null) {
  try {
    if (n.audience?.type === "segment") {
      const people =
        preResolvedPeople ||
        (await resolveAudience(n.audience.segment, { categoryId: n.audience.categoryId }));
      const items = people.map((p) => {
        const vars = {
          name: p.name || "there",
          product: p.product?.name || "",
          count: p.count ?? 0,
        };
        const usePersonalImg = Boolean(n.personalImage && p.product?.image);
        return {
          customerId: p.customerId,
          title: fill(n.title, vars),
          body: fill(n.body, vars),
          link: n.link || (p.product?.slug ? `/product/${p.product.slug}` : ""),
          imageUrl: usePersonalImg ? pushImage(p.product.image) : n.imageUrl || "",
        };
      });
      const stats = await sendPersonalBatch(items, { key: "campaign", marketing: true });
      n.stats = stats;
      if (stats.withDevice === 0) {
        throw new Error("No customers in this audience have the app installed");
      }
      n.sentAt = new Date();
      n.status = "sent";
      n.claimExpiresAt = undefined;
      n.result = { ok: true };
    } else {
      if (n.channel === "app" || n.channel === "both") await sendToTopic(n);
      n.sentAt = new Date();
      if (n.channel === "web" || n.channel === "both") {
        n.tickerEndsAt = new Date(Date.now() + (n.tickerDurationHours || 24) * 3600 * 1000);
      }
      n.status = "sent";
      n.claimExpiresAt = undefined;
      n.result = { ok: true };
    }
  } catch (e) {
    n.status = "failed";
    n.claimExpiresAt = undefined;
    n.result = { ok: false, error: e.message };
  }
  await n.save();
  return n;
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
          { new: true }
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
          { claimExpiresAt },
          { new: true }
        );
        if (!claimedExpired) continue;

        // Account for whether the provider may already have accepted the send
        if (claimedExpired.sentAt) {
          claimedExpired.status = "sent";
          claimedExpired.claimExpiresAt = undefined;
          claimedExpired.result = claimedExpired.result || { ok: true };
          await claimedExpired.save();
          continue;
        }

        if (claimedExpired.channel === "app" || claimedExpired.channel === "both") {
          claimedExpired.status = "failed";
          claimedExpired.claimExpiresAt = undefined;
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
  fill,
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
  fill,
  istHour,
  pushEnabled,
  pushStubEnabled,
  pushImage,
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
