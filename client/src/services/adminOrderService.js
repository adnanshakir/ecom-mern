import api from "@/services/admin/axios";

export const getAdminOrders = (params) => api.get("/orders", { params });
export const getAdminOrderStats = () => api.get("/orders/stats");
export const getAdminOrder = (id) => api.get(`/orders/${id}`).then(({ data }) => data.data);
export const updateAdminOrderStatus = (id, orderStatus) => api.patch(`/orders/${id}/status`, { orderStatus });
export const markAdminOrderSeen = (id) => api.patch(`/orders/${id}/seen`);
