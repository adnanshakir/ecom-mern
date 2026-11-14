import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 65 },
    body: { type: String, trim: true, maxlength: 240, default: "" },
    type: {
      type: String,
      enum: ["sale", "flash_sale", "tagline", "free_shipping", "new_arrival", "festive", "coupon", "win_back", "custom"],
      default: "custom",
    },
    channel: { type: String, enum: ["web", "app", "both"], default: "both" },
    link: { type: String, default: "" }, // e.g. /products/some-slug or /sale
    imageUrl: { type: String, trim: true, default: "" }, // optional, https only
    status: { type: String, enum: ["scheduled", "sending", "sent", "failed", "cancelled"], default: "scheduled" },
    scheduledAt: Date,
    sentAt: Date,
    tickerDurationHours: { type: Number, default: 24 },
    tickerEndsAt: Date,
    result: { ok: Boolean, error: String },
  },
  { timestamps: true }
);
notificationSchema.index({ status: 1, scheduledAt: 1 });
notificationSchema.index({ status: 1, tickerEndsAt: 1 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
export { Notification };

