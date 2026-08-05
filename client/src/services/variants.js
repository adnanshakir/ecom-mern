import api from "@/services/axios";

export const getVariants = (productId) =>
  api.get(`/products/${productId}/variants`);

export const createVariant = (productId, payload) =>
  api.post(`/products/${productId}/variants`, payload);

export const updateVariant = (productId, variantId, payload) =>
  api.put(`/products/${productId}/variants/${variantId}`, payload);

export const deleteVariant = (productId, variantId) =>
  api.delete(`/products/${productId}/variants/${variantId}`);