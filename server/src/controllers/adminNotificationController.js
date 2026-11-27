import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import NotificationTemplate from "../models/NotificationTemplate.js";
import DeviceToken from "../models/DeviceToken.js";
import { dispatch, resolveAutoImage } from "../services/notificationService.js";
import { resolveAudience, countAudience } from "../services/notificationAudience.js";

const VALID_TYPES = [
  "sale",
  "flash_sale",
  "tagline",
  "free_shipping",
  "new_arrival",
  "festive",
  "coupon",
  "win_back",
  "custom",
];
const VALID_CHANNELS = ["web", "app", "both"];
const VALID_SEGMENTS = [
  "cart",
  "wishlist",
  "category",
  "inactive_30d",
  "never_ordered",
  "bought_before",
];
const AUTO_VARS_REGEX = /\{\{(?:name|product|count)\}\}/g;

const hasUnallowedPlaceholders = (text, allowAutoVars) => {
  const cleaned = allowAutoVars ? (text || "").replace(AUTO_VARS_REGEX, "") : text || "";
  return /\{\{/.test(cleaned);
};

export const resolveImage = async (req, res) => {
  try {
    const { link } = req.body || {};
    if (typeof link !== "string") {
      return res.status(400).json({ message: "Link must be a string" });
    }
    const imageUrl = await resolveAutoImage(link);
    res.json({ imageUrl });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
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
      autoImage = true,
      sendNow = true,
      scheduledAt,
      tickerDurationHours = 24,
      audience,
      personalImage = false,
    } = req.body;
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (title.trim().length > 65) {
      return res.status(400).json({ message: "Title cannot exceed 65 characters" });
    }
    if (typeof body !== "string") {
      return res.status(400).json({ message: "Body must be a string" });
    }
    if (body.trim().length > 240) {
      return res.status(400).json({ message: "Body cannot exceed 240 characters" });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ message: "Invalid notification type" });
    }
    if (!VALID_CHANNELS.includes(channel)) {
      return res.status(400).json({ message: "Invalid channel" });
    }

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

    if (typeof imageUrl !== "string") {
      return res.status(400).json({ message: "Image URL must be a string" });
    }
    if (imageUrl.trim() && !/^https:\/\//i.test(imageUrl.trim())) {
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
    const useAutoImage = autoImage !== false && autoImage !== "false";
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
      autoImage: useAutoImage,
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid notification id" });
    }
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, status: "scheduled" },
      { status: "cancelled" },
      { returnDocument: "after" }
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid notification id" });
    }
    const n = await Notification.findByIdAndUpdate(
      req.params.id,
      { tickerEndsAt: new Date() },
      { returnDocument: "after" }
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
    if (!VALID_CHANNELS.includes(channel)) {
      return res.status(400).json({ message: "Invalid channel" });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ message: "Invalid type" });
    }

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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid template id" });
    }
    const { name, type, titleTpl, bodyTpl, channel, enabled } = req.body;
    const tpl = await NotificationTemplate.findById(req.params.id);
    if (!tpl) return res.status(404).json({ message: "Template not found" });

    if (name !== undefined) tpl.name = name.trim();
    if (type !== undefined) tpl.type = type;
    if (titleTpl !== undefined) tpl.titleTpl = titleTpl.trim();
    if (bodyTpl !== undefined) tpl.bodyTpl = (bodyTpl || "").trim();
    if (enabled !== undefined) tpl.enabled = Boolean(enabled);
    if (channel !== undefined) {
      if (!VALID_CHANNELS.includes(channel)) {
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid template id" });
    }
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
  resolveImage,
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
