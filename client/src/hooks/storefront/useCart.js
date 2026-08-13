"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  selectCartItems,
  selectCartCount,
  selectCartStatus,
  selectCartPendingVariants,
} from "@/redux/slices/cartSlice";

/**
 * useCart — provides cart state and all cart mutation actions.
 *
 * Usage:
 *   const { items, count, addItem, updateItem, removeItem, clear, isPending } = useCart();
 *
 * isPending(variantId) returns true while a specific line item is being mutated,
 * so callers can show per-button spinners without blocking the whole cart.
 */
export function useCart() {
  const dispatch = useDispatch();
  const items = useSelector(selectCartItems);
  const count = useSelector(selectCartCount);
  const status = useSelector(selectCartStatus);
  const pendingVariants = useSelector(selectCartPendingVariants);

  const addItem = (variantId, quantity = 1) =>
    dispatch(addToCart({ variantId, quantity }));

  const updateItem = (variantId, quantity) =>
    dispatch(updateCartItem({ variantId, quantity }));

  const removeItem = (variantId) => dispatch(removeCartItem(variantId));

  const clear = () => dispatch(clearCart());

  const isPending = (variantId) => pendingVariants.includes(variantId);

  return { items, count, status, addItem, updateItem, removeItem, clear, isPending };
}
