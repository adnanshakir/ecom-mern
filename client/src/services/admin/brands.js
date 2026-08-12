import api from "@/services/admin/axios";

export const getBrands = () => api.get("/brands");

export const createBrand = (payload) => api.post("/brands", payload);

export const updateBrand = (id, payload) => api.put(`/brands/${id}`, payload);

export const deleteBrand = (id) => api.delete(`/brands/${id}`);
