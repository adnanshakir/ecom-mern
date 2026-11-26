import mongoose from "mongoose";

const schema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "CustomerProfile", index: true },
  key: { type: String, index: true }, // "cart_reminder", "price_drop", "campaign"
  marketing: { type: Boolean, default: true },
  sentAt: { type: Date, default: Date.now, index: { expires: "30d" } },
});

export default mongoose.model("NotificationLog", schema);
