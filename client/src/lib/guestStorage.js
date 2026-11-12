"use client";

export const GUEST_CART_STORAGE_KEY = "ecommerce_guest_cart";
export const GUEST_CART_REVISION_KEY = "ecommerce_guest_cart_revision";
export const GUEST_CART_PENDING_BATCH_KEY = "ecommerce_guest_cart_pending_batch";
export const GUEST_WISHLIST_STORAGE_KEY = "ecommerce_guest_wishlist";
export const GUEST_WISHLIST_REVISION_KEY = "ecommerce_guest_wishlist_revision";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

function isValidObjectId(value) {
  return typeof value === "string" && OBJECT_ID_REGEX.test(value.trim());
}

function isValidGuestCartEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
  if (!Number.isInteger(entry.quantity) || entry.quantity <= 0) return false;

  const variant = entry.variant;
  if (!variant || typeof variant !== "object" || Array.isArray(variant)) return false;
  if (!isValidObjectId(variant._id)) return false;
  if (entry.variantId !== undefined && !isValidObjectId(entry.variantId)) return false;

  if (typeof variant.price !== "number" || !Number.isFinite(variant.price) || variant.price < 0) {
    return false;
  }
  if (
    variant.salePrice !== undefined &&
    variant.salePrice !== null &&
    (typeof variant.salePrice !== "number" || !Number.isFinite(variant.salePrice) || variant.salePrice < 0)
  ) {
    return false;
  }
  if (
    variant.stock !== undefined &&
    variant.stock !== null &&
    (typeof variant.stock !== "number" || !Number.isFinite(variant.stock) || variant.stock < 0)
  ) {
    return false;
  }
  if (variant.sku !== undefined && typeof variant.sku !== "string") return false;

  const product = variant.product;
  if (!product || typeof product !== "object" || Array.isArray(product)) return false;
  if (typeof product.name !== "string" || !product.name.trim()) return false;
  if (product.slug !== undefined && typeof product.slug !== "string") return false;
  if (!Array.isArray(product.images)) return false;

  return true;
}

function isValidGuestWishlistEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
  if (!isValidObjectId(entry._id)) return false;
  if (typeof entry.name !== "string" || !entry.name.trim()) return false;
  if (typeof entry.slug !== "string") return false;
  if (!Array.isArray(entry.images)) return false;
  if (!Array.isArray(entry.variants)) return false;
  return true;
}

function bumpRevision(revisionKey) {
  const current = Number.parseInt(localStorage.getItem(revisionKey) || "0", 10) || 0;
  localStorage.setItem(revisionKey, String(current + 1));
}

function buildRevisionToken(storageKey, revisionKey) {
  if (typeof window === "undefined") return "0:";
  try {
    const rev = localStorage.getItem(revisionKey) || "0";
    const raw = localStorage.getItem(storageKey) || "";
    return `${rev}:${raw}`;
  } catch {
    return "0:";
  }
}

export function createMergeBatchId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `batch_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// ── Cart Storage ─────────────────────────────────────────────────────────────

export function getGuestCart() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidGuestCartEntry) : [];
  } catch (err) {
    console.error("Failed to read guest cart from localStorage:", err);
    return [];
  }
}

export function getGuestCartRevision() {
  return buildRevisionToken(GUEST_CART_STORAGE_KEY, GUEST_CART_REVISION_KEY);
}

export function saveGuestCart(items) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(items));
    bumpRevision(GUEST_CART_REVISION_KEY);
    window.dispatchEvent(new Event("guestCartChanged"));
  } catch (err) {
    console.error("Failed to save guest cart to localStorage:", err);
  }
}

export function clearGuestCart() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GUEST_CART_STORAGE_KEY);
    bumpRevision(GUEST_CART_REVISION_KEY);
    window.dispatchEvent(new Event("guestCartChanged"));
  } catch (err) {
    console.error("Failed to clear guest cart in localStorage:", err);
  }
}

export function getPendingCartMergeBatch() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(GUEST_CART_PENDING_BATCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.batchId !== "string" ||
      !parsed.batchId.trim() ||
      !Array.isArray(parsed.items)
    ) {
      return null;
    }
    const validItems = parsed.items.filter(
      (i) => i && isValidObjectId(i.variantId) && Number.isInteger(i.quantity) && i.quantity > 0
    );
    if (validItems.length === 0) return null;
    return {
      batchId: parsed.batchId,
      items: validItems,
      revision: typeof parsed.revision === "string" ? parsed.revision : "",
    };
  } catch {
    return null;
  }
}

export function savePendingCartMergeBatch(batch) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GUEST_CART_PENDING_BATCH_KEY, JSON.stringify(batch));
  } catch (err) {
    console.error("Failed to persist pending cart merge batch:", err);
  }
}

export function clearPendingCartMergeBatch() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GUEST_CART_PENDING_BATCH_KEY);
  } catch (err) {
    console.error("Failed to clear pending cart merge batch:", err);
  }
}

/**
 * Reconciles guest cart localStorage after a merge batch succeeds.
 * If storage did not change while the request was pending, clears everything;
 * otherwise removes only the merged items/quantities so concurrent additions remain intact.
 */
export function reconcileGuestCartAfterMerge(submittedItems, submittedRevision) {
  if (typeof window === "undefined") return [];
  if (getGuestCartRevision() === submittedRevision) {
    clearGuestCart();
    return [];
  }

  const submittedQtyMap = new Map();
  for (const item of submittedItems || []) {
    const vid = item?.variantId?.toString();
    const qty = Number(item?.quantity) || 0;
    if (vid && qty > 0) {
      submittedQtyMap.set(vid, (submittedQtyMap.get(vid) || 0) + qty);
    }
  }

  const remaining = [];
  for (const entry of getGuestCart()) {
    const vid = (entry.variant?._id || entry.variantId)?.toString();
    const mergedQty = submittedQtyMap.get(vid) || 0;
    if (mergedQty > 0) {
      const nextQty = entry.quantity - mergedQty;
      submittedQtyMap.set(vid, Math.max(0, mergedQty - entry.quantity));
      if (nextQty > 0) {
        remaining.push({ ...entry, quantity: nextQty });
      }
    } else {
      remaining.push(entry);
    }
  }

  if (remaining.length === 0) {
    clearGuestCart();
  } else {
    saveGuestCart(remaining);
  }
  return remaining;
}

// ── Wishlist Storage ──────────────────────────────────────────────────────────

export function getGuestWishlist() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidGuestWishlistEntry) : [];
  } catch (err) {
    console.error("Failed to read guest wishlist from localStorage:", err);
    return [];
  }
}

export function getGuestWishlistRevision() {
  return buildRevisionToken(GUEST_WISHLIST_STORAGE_KEY, GUEST_WISHLIST_REVISION_KEY);
}

export function saveGuestWishlist(products) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GUEST_WISHLIST_STORAGE_KEY, JSON.stringify(products));
    bumpRevision(GUEST_WISHLIST_REVISION_KEY);
    window.dispatchEvent(new Event("guestWishlistChanged"));
  } catch (err) {
    console.error("Failed to save guest wishlist to localStorage:", err);
  }
}

export function clearGuestWishlist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GUEST_WISHLIST_STORAGE_KEY);
    bumpRevision(GUEST_WISHLIST_REVISION_KEY);
    window.dispatchEvent(new Event("guestWishlistChanged"));
  } catch (err) {
    console.error("Failed to clear guest wishlist in localStorage:", err);
  }
}

/**
 * Reconciles guest wishlist localStorage after a merge succeeds.
 * Preserves items added while the merge request was in-flight.
 */
export function reconcileGuestWishlistAfterMerge(submittedProductIds, submittedRevision) {
  if (typeof window === "undefined") return [];
  if (getGuestWishlistRevision() === submittedRevision) {
    clearGuestWishlist();
    return [];
  }

  const mergedIds = new Set((submittedProductIds || []).map((id) => id.toString()));
  const remaining = getGuestWishlist().filter((p) => !mergedIds.has((p._id || p).toString()));

  if (remaining.length === 0) {
    clearGuestWishlist();
  } else {
    saveGuestWishlist(remaining);
  }
  return remaining;
}

