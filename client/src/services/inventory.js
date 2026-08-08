import api from "@/services/axios";

export const getMovements = (variantId, params) => api.get(`/inventory/movements/${variantId}`, { params });

export const createMovement = (payload) => api.post("/inventory/movements", payload);

export const getReconcile = (variantId) => api.get(`/inventory/reconcile/${variantId}`);
