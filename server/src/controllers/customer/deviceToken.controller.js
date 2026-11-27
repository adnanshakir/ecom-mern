import DeviceToken from "../../models/DeviceToken.js";

export const registerDevice = async (req, res) => {
  try {
    const { token, platform = "android" } = req.body;
    if (typeof token !== "string" || !token.trim()) {
      return res.status(400).json({ message: "Token is required" });
    }
    const trimmedToken = token.trim();

    const customerId = req.customerProfile?._id || req.customer?._id || req.customer?.id;
    if (!customerId) return res.status(401).json({ message: "Customer profile not found" });

    const device = await DeviceToken.findOneAndUpdate(
      { token: trimmedToken },
      {
        customer: customerId,
        platform: platform === "ios" ? "ios" : "android",
        lastSeenAt: new Date(),
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, deviceToken: device });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const unregisterDevice = async (req, res) => {
  try {
    const { token } = req.body;
    if (typeof token !== "string" || !token.trim()) {
      return res.status(400).json({ message: "Token is required" });
    }
    const trimmedToken = token.trim();

    const customerId = req.customerProfile?._id || req.customer?._id || req.customer?.id;
    if (!customerId) return res.status(401).json({ message: "Customer profile not found" });

    await DeviceToken.deleteOne({ token: trimmedToken, customer: customerId });
    res.status(200).json({ success: true, message: "Device token deleted" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export default { registerDevice, unregisterDevice };
