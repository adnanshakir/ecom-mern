"use client";

export const GUEST_CART_STORAGE_KEY = "ecommerce_guest_cart";
export const GUEST_WISHLIST_STORAGE_KEY = "ecommerce_guest_wishlist";

// ── Cart Storage ─────────────────────────────────────────────────────────────

export function getGuestCart() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to read guest cart from localStorage:", err);
    return [];
  }
}

export function saveGuestCart(items) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("guestCartChanged"));
  } catch (err) {
    console.error("Failed to save guest cart to localStorage:", err);
  }
}

export function clearGuestCart() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GUEST_CART_STORAGE_KEY);
    window.dispatchEvent(new Event("guestCartChanged"));
  } catch (err) {
    console.error("Failed to clear guest cart in localStorage:", err);
  }
}

// ── Wishlist Storage ──────────────────────────────────────────────────────────

export function getGuestWishlist() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to read guest wishlist from localStorage:", err);
    return [];
  }
}

export function saveGuestWishlist(products) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GUEST_WISHLIST_STORAGE_KEY, JSON.stringify(products));
    window.dispatchEvent(new Event("guestWishlistChanged"));
  } catch (err) {
    console.error("Failed to save guest wishlist to localStorage:", err);
  }
}

export function clearGuestWishlist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GUEST_WISHLIST_STORAGE_KEY);
    window.dispatchEvent(new Event("guestWishlistChanged"));
  } catch (err) {
    console.error("Failed to clear guest wishlist in localStorage:", err);
  }
}

