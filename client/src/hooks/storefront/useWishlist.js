"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  addToWishlist,
  removeFromWishlist,
  toggleGuestWishlist,
  selectIsInWishlist,
  selectWishlistPending,
} from "@/redux/slices/wishlistSlice";

/**
 * useWishlist — provides wishlist state and toggle action for a single product
 * for both authenticated and guest customers.
 *
 * Usage:
 *   const { isWishlisted, toggle, isPending } = useWishlist(productId);
 */
export function useWishlist(productId) {
  const dispatch = useDispatch();
  const isWishlisted = useSelector(selectIsInWishlist(productId));
  const pendingProducts = useSelector(selectWishlistPending);

  const authStatus = useSelector((state) => state.customerAuth.status);
  const isAuthenticated = authStatus === "authenticated";

  const isPending = pendingProducts.includes(productId?.toString());

  const toggle = (productSnapshot = null) => {
    if (!productId) return;

    if (isAuthenticated) {
      if (isWishlisted) {
        dispatch(removeFromWishlist(productId.toString()));
      } else {
        dispatch(addToWishlist(productId.toString()));
      }
    } else {
      // Guest mode
      const product = productSnapshot || {
        _id: productId.toString(),
        name: "Product",
        slug: "",
        images: [],
        variants: [],
      };
      dispatch(toggleGuestWishlist(product));
    }
  };

  return { isWishlisted, isPending, toggle };
}
