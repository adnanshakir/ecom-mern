"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  addToWishlist,
  removeFromWishlist,
  selectIsInWishlist,
  selectWishlistPending,
} from "@/redux/slices/wishlistSlice";

/**
 * useWishlist — provides wishlist state and toggle action for a single product.
 *
 * Usage:
 *   const { isWishlisted, toggle, isPending } = useWishlist(productId);
 *
 * Calling toggle() adds the product if not yet wishlisted, removes it otherwise.
 */
export function useWishlist(productId) {
  const dispatch = useDispatch();
  const isWishlisted = useSelector(selectIsInWishlist(productId));
  const pendingProducts = useSelector(selectWishlistPending);

  const isPending = pendingProducts.includes(productId?.toString());

  const toggle = () => {
    if (!productId) return;
    if (isWishlisted) {
      dispatch(removeFromWishlist(productId.toString()));
    } else {
      dispatch(addToWishlist(productId.toString()));
    }
  };

  return { isWishlisted, isPending, toggle };
}
