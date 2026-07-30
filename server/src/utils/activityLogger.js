import ActivityLog from "../models/activityLog.model.js";

export const logActivity = async ({ userId, action, resource, resourceId, description }) => {
  try {
    await ActivityLog.create({ user: userId, action, resource, resourceId, description });
  } catch (err) {
    console.error("Failed to write activity log:", err.message);
  }
};