"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  addGuestCartItem,
  updateGuestCartItem,
  removeGuestCartItem,
  clearGuestCartAction,
  selectCartItems,
  selectCartCount,
  selectCartStatus,
  selectCartPendingVariants,
} from "@/redux/slices/cartSlice";

/**
 * useCart — provides cart state and all cart mutation actions for both
 * authenticated and guest customers.
 */
export function useCart() {
  const dispatch = useDispatch();
  const items = useSelector(selectCartItems);
  const count = useSelector(selectCartCount);
  const status = useSelector(selectCartStatus);
  const pendingVariants = useSelector(selectCartPendingVariants);

  const authStatus = useSelector((state) => state.customerAuth.status);
  const isAuthenticated = authStatus === "authenticated";

  const addItem = async (variantId, quantity = 1, variantSnapshot = null) => {
    if (isAuthenticated) {
      return dispatch(addToCart({ variantId, quantity }));
    } else {
      // Guest mode: save to localStorage
      const variant = variantSnapshot?.variant || {
        _id: variantId,
        sku: variantSnapshot?.sku || "",
        price: variantSnapshot?.price || 0,
        salePrice: variantSnapshot?.salePrice,
        stock: variantSnapshot?.stock || 999,
        product: variantSnapshot?.product || { name: "Product", slug: "", images: [] },
      };

      dispatch(addGuestCartItem({ variant, quantity }));
      return { payload: { items } };
    }
  };

  const updateItem = async (variantId, quantity) => {
    if (isAuthenticated) {
      return dispatch(updateCartItem({ variantId, quantity }));
    } else {
      dispatch(updateGuestCartItem({ variantId, quantity }));
      return { payload: items };
    }
  };

  const removeItem = async (variantId) => {
    if (isAuthenticated) {
      return dispatch(removeCartItem(variantId));
    } else {
      dispatch(removeGuestCartItem(variantId));
      return { payload: items };
    }
  };

  const clear = async () => {
    if (isAuthenticated) {
      return dispatch(clearCart());
    } else {
      dispatch(clearGuestCartAction());
      return { payload: [] };
    }
  };

  const isPending = (variantId) => pendingVariants.includes(variantId);

  return { items, count, status, addItem, updateItem, removeItem, clear, isPending };
}
