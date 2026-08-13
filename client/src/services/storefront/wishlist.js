import customerApi from "@/services/storefront/customerAxios";

export const getWishlistRequest = () => customerApi.get("/customers/wishlist");

export const addToWishlistRequest = (productId) =>
  customerApi.post("/customers/wishlist/items", { productId });

export const removeFromWishlistRequest = (productId) =>
  customerApi.delete(`/customers/wishlist/items/${productId}`);
