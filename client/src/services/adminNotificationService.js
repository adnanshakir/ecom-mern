import api from "@/services/admin/axios";

export const getNotifications = (params) => api.get("/admin/notifications", { params });

export const createNotification = (payload) => api.post("/admin/notifications", payload);

export const cancelNotification = (id) => api.patch(`/admin/notifications/${id}/cancel`);

export const endTicker = (id) => api.patch(`/admin/notifications/${id}/end-ticker`);

export const getTemplates = (params) => api.get("/admin/notification-templates", { params });

export const createTemplate = (payload) => api.post("/admin/notification-templates", payload);

export const updateTemplate = (id, payload) => api.patch(`/admin/notification-templates/${id}`, payload);

export const deleteTemplate = (id) => api.delete(`/admin/notification-templates/${id}`);

