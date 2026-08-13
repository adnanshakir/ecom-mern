import customerApi from "@/services/storefront/customerAxios";

export const getCartRequest = () => customerApi.get("/customers/cart");

export const addToCartRequest = (variantId, quantity) =>
  customerApi.post("/customers/cart/items", { variantId, quantity });

export const updateCartItemRequest = (variantId, quantity) =>
  customerApi.put(`/customers/cart/items/${variantId}`, { quantity });

export const removeCartItemRequest = (variantId) =>
  customerApi.delete(`/customers/cart/items/${variantId}`);

export const clearCartRequest = () => customerApi.delete("/customers/cart");
