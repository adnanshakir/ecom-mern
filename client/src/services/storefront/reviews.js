import customerApi from "@/services/storefront/customerAxios";
import publicApi from "@/services/publicApi";

// ────────── Public (no auth) ──────────

export const getProductReviews = (productId, params) =>
  publicApi.get(`/public/products/${productId}/reviews`, { params });

export const getReviewSummary = (productId) =>
  publicApi.get(`/public/products/${productId}/reviews/summary`);

// ────────── Customer Auth ──────────

export const getMyReview = (productId) =>
  customerApi.get(`/customers/reviews/mine/${productId}`);

export const createReview = (productId, data) =>
  customerApi.post(`/customers/reviews/${productId}`, data);

export const updateReview = (reviewId, data) =>
  customerApi.put(`/customers/reviews/${reviewId}`, data);

export const deleteReview = (reviewId) =>
  customerApi.delete(`/customers/reviews/${reviewId}`);

/**
 * Upload review images (customer-scoped endpoint).
 * Returns the same shape as admin uploadImages so ImageUploader can consume it.
 */
export const uploadReviewImages = (files) => {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append("image", file));
  return customerApi.post("/customers/images/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
