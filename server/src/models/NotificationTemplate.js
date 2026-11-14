import mongoose from "mongoose";

const templateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true }, // slug, e.g. "flash_sale"
    name: { type: String, required: true, trim: true },
    type: { type: String, default: "custom" },
    titleTpl: { type: String, required: true, trim: true },
    bodyTpl: { type: String, default: "", trim: true },
    channel: { type: String, enum: ["web", "app", "both"], default: "both" },
    auto: { type: Boolean, default: false },     // fired automatically by backend
    isSystem: { type: Boolean, default: false }, // cannot be deleted
  },
  { timestamps: true }
);

const NotificationTemplate = mongoose.model("NotificationTemplate", templateSchema);
export default NotificationTemplate;
export { NotificationTemplate };

