import Notification from "../models/Notification.js";
import NotificationTemplate from "../models/NotificationTemplate.js";
import DeviceToken from "../models/DeviceToken.js";
import { dispatch } from "../services/notificationService.js";
import { resolveAudience, countAudience } from "../services/notificationAudience.js";

const VALID_SEGMENTS = [
  "cart",
  "wishlist",
  "category",
  "inactive_30d",
  "never_ordered",
  "bought_before",
];
const AUTO_VARS_SET = new Set(["name", "product", "count"]);

const hasUnallowedPlaceholders = (text, allowAutoVars) => {
  const matches = [...(text || "").matchAll(/\{\{(\w*)\}\}/g)];
  if (!matches.length) return false;
  if (!allowAutoVars) return true;
  return matches.some((m) => !AUTO_VARS_SET.has(m[1]));
};

export const getAudienceCount = async (req, res) => {
  try {
    const { segment, categoryId } = req.body || {};
    if (!VALID_SEGMENTS.includes(segment)) {
      return res.status(400).json({ message: "Invalid audience segment" });
    }
    if (segment === "category" && !categoryId) {
      return res.json({ total: 0, withApp: 0 });
    }
    const counts = await countAudience(segment, { categoryId });
    res.json(counts);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const createNotification = async (req, res) => {
  try {
    const {
      title,
      body = "",
      type = "custom",
      channel = "both",
      link = "",
      imageUrl = "",
      sendNow = true,
      scheduledAt,
      tickerDurationHours = 24,
      audience,
      personalImage = false,
    } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ message: "Title is required" });

    const isSegment = audience?.type === "segment";
    if (isSegment) {
      if (!VALID_SEGMENTS.includes(audience.segment)) {
        return res.status(400).json({ message: "Invalid audience segment" });
      }
      if (audience.segment === "category" && !audience.categoryId) {
        return res.status(400).json({ message: "Category is required for category audience" });
      }
    }

    if (hasUnallowedPlaceholders(`${title} ${body}`, isSegment)) {
      return res.status(400).json({ message: "Fill all {{placeholders}} before sending" });
    }

    if (imageUrl && imageUrl.trim() && !/^https:\/\//i.test(imageUrl.trim())) {
      return res.status(400).json({ message: "Image URL must start with https://" });
    }

    let when = new Date();
    if (!sendNow) {
      when = new Date(scheduledAt);
      if (isNaN(when.getTime()) || when.getTime() < Date.now() + 60000) {
        return res
          .status(400)
          .json({ message: "Schedule time must be at least 1 minute in the future" });
      }
    }

    const effectiveChannel = isSegment ? "app" : channel;
    const normalizedAudience = isSegment
      ? {
          type: "segment",
          segment: audience.segment,
          ...(audience.categoryId ? { categoryId: String(audience.categoryId) } : {}),
        }
      : { type: "all" };

    let preResolvedPeople = null;
    if (isSegment && sendNow) {
      preResolvedPeople = await resolveAudience(normalizedAudience.segment, {
        categoryId: normalizedAudience.categoryId,
      });
      const ids = preResolvedPeople.map((p) => p.customerId);
      const withDeviceCount = ids.length
        ? (await DeviceToken.distinct("customer", { customer: { $in: ids } })).length
        : 0;
      if (withDeviceCount === 0) {
        return res
          .status(400)
          .json({ message: "No customers in this audience have the app installed" });
      }
    }

    let n = await Notification.create({
      title: title.trim(),
      body: body.trim(),
      type,
      channel: effectiveChannel,
      link,
      imageUrl: imageUrl.trim(),
      tickerDurationHours,
      audience: normalizedAudience,
      personalImage: isSegment ? Boolean(personalImage) : false,
      status: sendNow ? "sending" : "scheduled",
      claimExpiresAt: sendNow ? new Date(Date.now() + 5 * 60 * 1000) : undefined,
      scheduledAt: when,
    });

    if (sendNow) {
      if (isSegment && preResolvedPeople && preResolvedPeople.length > 2000) {
        dispatch(n, preResolvedPeople).catch(console.error);
        return res.status(201).json({ notification: n });
      }
      n = await dispatch(n, preResolvedPeople);
    }
    res.status(201).json({ notification: n });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const cancelNotification = async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, status: "scheduled" },
      { status: "cancelled" },
      { new: true }
    );
    if (!n)
      return res.status(400).json({ message: "Only scheduled notifications can be cancelled" });
    res.json({ notification: n });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const endTicker = async (req, res) => {
  try {
    const n = await Notification.findByIdAndUpdate(
      req.params.id,
      { tickerEndsAt: new Date() },
      { new: true }
    );
    if (!n) return res.status(404).json({ message: "Not found" });
    res.json({ notification: n });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const listNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = {};
    if (status && status !== "all") {
      filter.status = status;
    }
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * safeLimit;

    const [rows, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
      Notification.countDocuments(filter),
    ]);

    const now = new Date();
    const items = rows.map((n) => ({
      ...n,
      isTickerLive:
        ["web", "both"].includes(n.channel) &&
        n.status === "sent" &&
        n.tickerEndsAt &&
        new Date(n.tickerEndsAt) > now,
    }));

    res.json({
      notifications: items,
      total,
      page: Number(page) || 1,
      pages: Math.ceil(total / safeLimit) || 1,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const listTemplates = async (req, res) => {
  try {
    const filter = {};
    if (req.query.auto === "false") {
      filter.auto = false;
    } else if (req.query.auto === "true") {
      filter.auto = true;
    }
    const templates = await NotificationTemplate.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ templates });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const createTemplate = async (req, res) => {
  try {
    const { name, type = "custom", titleTpl, bodyTpl = "", channel = "both" } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "Name is required" });
    if (!titleTpl || !titleTpl.trim())
      return res.status(400).json({ message: "Title template is required" });

    const baseSlug =
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "tpl";
    const rand = Math.random().toString(36).substring(2, 6);
    const key = `${baseSlug}_${rand}`;

    const tpl = await NotificationTemplate.create({
      key,
      name: name.trim(),
      type,
      titleTpl: titleTpl.trim(),
      bodyTpl: (bodyTpl || "").trim(),
      channel,
      auto: false,
      isSystem: false,
    });
    res.status(201).json({ template: tpl });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const updateTemplate = async (req, res) => {
  try {
    const { name, type, titleTpl, bodyTpl, channel, enabled } = req.body;
    const tpl = await NotificationTemplate.findById(req.params.id);
    if (!tpl) return res.status(404).json({ message: "Template not found" });

    if (name !== undefined) tpl.name = name.trim();
    if (type !== undefined) tpl.type = type;
    if (titleTpl !== undefined) tpl.titleTpl = titleTpl.trim();
    if (bodyTpl !== undefined) tpl.bodyTpl = (bodyTpl || "").trim();
    if (enabled !== undefined) tpl.enabled = Boolean(enabled);
    if (channel !== undefined) {
      if (!["web", "app", "both"].includes(channel)) {
        return res.status(400).json({ message: "Invalid channel" });
      }
      if (tpl.auto && channel !== "app") {
        return res.status(400).json({
          message: "Automatic templates only support the 'app' channel for personal delivery",
        });
      }
      tpl.channel = channel;
    }

    await tpl.save();
    res.json({ template: tpl });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const deleteTemplate = async (req, res) => {
  try {
    const tpl = await NotificationTemplate.findById(req.params.id);
    if (!tpl) return res.status(404).json({ message: "Template not found" });
    if (tpl.isSystem) {
      return res.status(400).json({ message: "System templates cannot be deleted" });
    }
    await tpl.deleteOne();
    res.json({ message: "Template deleted" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export default {
  getAudienceCount,
  createNotification,
  cancelNotification,
  endTicker,
  listNotifications,
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
};
