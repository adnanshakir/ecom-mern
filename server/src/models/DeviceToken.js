import mongoose from "mongoose";

const deviceTokenSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "CustomerProfile", required: true, index: true },
    token: { type: String, required: true, unique: true },
    platform: { type: String, enum: ["android", "ios"], default: "android" },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const DeviceToken = mongoose.model("DeviceToken", deviceTokenSchema);
export default DeviceToken;
export { DeviceToken };

