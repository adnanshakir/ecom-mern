import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import cron from "node-cron";
import Notification from "../models/Notification.js";
import NotificationTemplate from "../models/NotificationTemplate.js";
import DeviceToken from "../models/DeviceToken.js";

const CLAIM_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

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
  process.env.NODE_ENV !== "production" &&
  (process.env.ALLOW_PUSH_STUB === "true" ||
    process.env.ENABLE_PUSH_STUB === "true" ||
    process.env.PUSH_STUB === "true");

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
  if (!t) return;
  await sendToCustomer(customerId, {
    title: fill(t.titleTpl, vars),
    body: fill(t.bodyTpl, vars),
    link: vars.link || "",
  });
}

// Send a Notification document now (app push and/or start web ticker)
async function dispatch(n) {
  try {
    if (n.channel === "app" || n.channel === "both") await sendToTopic(n);
    n.sentAt = new Date();
    if (n.channel === "web" || n.channel === "both") {
      n.tickerEndsAt = new Date(Date.now() + (n.tickerDurationHours || 24) * 3600 * 1000);
    }
    n.status = "sent";
    n.claimExpiresAt = undefined;
    n.result = { ok: true };
  } catch (e) {
    n.status = "failed";
    n.claimExpiresAt = undefined;
    n.result = { ok: false, error: e.message };
  }
  await n.save();
  return n;
}

function startNotificationScheduler() {
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

        // Before retrying an abandoned claim, account for whether the provider
        // may already have accepted the send, and preserve safeguards against duplicate delivery
        // when the outcome is unknown; do not assume it is safe to retry without establishing
        // the existing delivery guarantees.
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
}

export {
  fill,
  sendToTopic,
  sendToCustomer,
  sendTemplateToCustomer,
  dispatch,
  startNotificationScheduler,
};
export default {
  fill,
  sendToTopic,
  sendToCustomer,
  sendTemplateToCustomer,
  dispatch,
  startNotificationScheduler,
};
