import publicApi from "@/services/publicApi";

export const getPublicProducts = (params) =>
  publicApi.get("/public/products", { params });

export const getPublicProductBySlug = (slug) =>
  publicApi.get(`/public/products/${slug}`);

export const getPublicCategories = () => publicApi.get("/public/categories");