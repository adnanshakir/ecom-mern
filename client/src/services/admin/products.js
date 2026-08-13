import api from "@/services/admin/axios";

export const getProducts = (params) => api.get("/products", { params });
export const getProduct = (id) => api.get(`/products/${id}`);
export const createProduct = (payload) => api.post("/products", payload);
export const updateProduct = (id, payload) => api.put(`/products/${id}`, payload);
export const deleteProduct = (id) => api.delete(`/products/${id}`);
export const bulkUpdateProducts = (ids, updates) => api.patch("/products/bulk", { ids, updates });
export const bulkDeleteProducts = (ids) => api.delete("/products/bulk", { data: { ids } });