import Notification from "../models/Notification.js";

export const activeTicker = async (req, res) => {
  try {
    const rows = await Notification.find({
      channel: { $in: ["web", "both"] },
      status: "sent",
      tickerEndsAt: { $gt: new Date() },
    })
      .sort({ sentAt: -1 })
      .limit(5)
      .select("title body link")
      .lean();

    res.set("Cache-Control", "public, max-age=60");
    res.json({
      items: rows.map((r) => ({
        _id: r._id,
        text: r.body ? `${r.title} — ${r.body}` : r.title,
        link: r.link || "",
      })),
    });
  } catch (e) {
    res.status(500).json({ items: [], message: e.message });
  }
};

export default { activeTicker };

