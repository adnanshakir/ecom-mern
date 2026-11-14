import admin from "firebase-admin";
import cron from "node-cron";
import Notification from "../models/Notification.js";
import NotificationTemplate from "../models/NotificationTemplate.js";
import DeviceToken from "../models/DeviceToken.js";

const getApps = () => (admin.apps || (typeof admin.getApps === "function" ? admin.getApps() : []));

if (!getApps().length && process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  } catch (e) {
    console.error("Firebase init error:", e.message);
  }
}
const pushEnabled = () => getApps().length > 0;

const fill = (tpl, vars = {}) => (tpl || "").replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : ""));

const buildMessage = ({ title, body, link, imageUrl }) => {
  const img = imageUrl && /^https:\/\//.test(imageUrl) ? imageUrl : undefined;
  return {
    notification: { title, ...(body ? { body } : {}), ...(img ? { imageUrl: img } : {}) },
    data: { link: link || "", imageUrl: img || "" }, // all values must be strings
    android: {
      priority: "high",
      notification: { channelId: "fibio_default", sound: "default", ...(img ? { imageUrl: img } : {}) },
    },
    apns: {
      payload: { aps: { sound: "default", mutableContent: true } },
      ...(img ? { fcmOptions: { imageUrl: img } } : {}),
    },
  };
};

// Broadcast to every app install (apps subscribe to topic "all")
async function sendToTopic(n) {
  if (!pushEnabled()) {
    console.log("[push stub:topic]", n.title, "|", n.body);
    return { ok: true };
  }
  await admin.messaging().send({ topic: "all", ...buildMessage(n) });
  return { ok: true };
}

// Personal push to one customer's devices
async function sendToCustomer(customerId, n) {
  const docs = await DeviceToken.find({ customer: customerId }).lean();
  const tokens = docs.map((d) => d.token);
  if (!tokens.length) return;
  if (!pushEnabled()) {
    console.log("[push stub:customer]", String(customerId), n.title, "|", n.body);
    return;
  }
  const res = await admin.messaging().sendEachForMulticast({ tokens, ...buildMessage(n) });
  const bad = [];
  res.responses.forEach((r, i) => {
    const code = r.error && r.error.code;
    if (!r.success && (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token")) {
      bad.push(tokens[i]);
    }
  });
  if (bad.length) await DeviceToken.deleteMany({ token: { $in: bad } });
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
    n.result = { ok: true };
  } catch (e) {
    n.status = "failed";
    n.result = { ok: false, error: e.message };
  }
  await n.save();
  return n;
}

function startNotificationScheduler() {
  cron.schedule("* * * * *", async () => {
    try {
      const due = await Notification.find({ status: "scheduled", scheduledAt: { $lte: new Date() } }).limit(20);
      for (const n of due) {
        // atomic claim so two server instances never double-send
        const claimed = await Notification.findOneAndUpdate({ _id: n._id, status: "scheduled" }, { status: "sending" }, { new: true });
        if (claimed) await dispatch(claimed);
      }
    } catch (e) {
      console.error("notification scheduler error:", e.message);
    }
  });
}

export { fill, sendToTopic, sendToCustomer, sendTemplateToCustomer, dispatch, startNotificationScheduler };
export default { fill, sendToTopic, sendToCustomer, sendTemplateToCustomer, dispatch, startNotificationScheduler };

