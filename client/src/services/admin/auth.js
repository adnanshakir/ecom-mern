import api from "@/services/admin/axios";

export const loginRequest = (payload) => api.post("/auth/login", payload);

export const refreshRequest = () => api.post("/auth/refresh");

export const logoutRequest = () => api.post("/auth/logout");

export const registerRequest = (payload) => api.post("/auth/register", payload);
