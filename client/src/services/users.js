import api from "@/services/axios";

export const getUsers = (params) => api.get("/users", { params });
export const updateUser = (id, payload) => api.put(`/users/${id}`, payload);
export const deleteUser = (id) => api.delete(`/users/${id}`);