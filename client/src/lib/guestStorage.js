"use client";

export const GUEST_CART_STORAGE_KEY = "ecommerce_guest_cart";
export const GUEST_CART_REVISION_KEY = "ecommerce_guest_cart_revision";
export const GUEST_CART_PENDING_BATCH_KEY = "ecommerce_guest_cart_pending_batch";
export const GUEST_CART_LOCK_KEY = "ecommerce_guest_cart_lock";
export const GUEST_WISHLIST_STORAGE_KEY = "ecommerce_guest_wishlist";
export const GUEST_WISHLIST_REVISION_KEY = "ecommerce_guest_wishlist_revision";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const CROSS_TAB_LOCK_TTL_MS = 5000;
let inProcessLockChain = Promise.resolve();

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

function emitGuestStorageEvent(eventName) {
  if (typeof window === "undefined") return;
  const dispatch = () => window.dispatchEvent(new Event(eventName));
  if (typeof queueMicrotask === "function") {
    queueMicrotask(dispatch);
  } else {
    setTimeout(dispatch, 0);
  }
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

export function readGuestCart() {
  if (typeof window === "undefined") return { ok: false, items: [] };
  try {
    const raw = localStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (!raw) return { ok: true, items: [] };
    const parsed = JSON.parse(raw);
    return { ok: true, items: Array.isArray(parsed) ? parsed.filter(isValidGuestCartEntry) : [] };
  } catch (err) {
    console.error("Failed to read guest cart from localStorage:", err);
    return { ok: false, items: [] };
  }
}

export function getGuestCart() {
  return readGuestCart().items;
}

export function getGuestCartRevision() {
  return buildRevisionToken(GUEST_CART_STORAGE_KEY, GUEST_CART_REVISION_KEY);
}

export function saveGuestCart(items) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(items));
    bumpRevision(GUEST_CART_REVISION_KEY);
    emitGuestStorageEvent("guestCartChanged");
  } catch (err) {
    console.error("Failed to save guest cart to localStorage:", err);
  }
}

export function clearGuestCart() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GUEST_CART_STORAGE_KEY);
    bumpRevision(GUEST_CART_REVISION_KEY);
    emitGuestStorageEvent("guestCartChanged");
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
 * Serializes guest cart batch read-check-save and claim-reconcile operations across tabs
 * using Web Locks when available, falling back to an in-process queue + localStorage lease mutex.
 */
export async function withGuestCartLock(task) {
  const runSerialized = async () => {
    if (typeof navigator !== "undefined" && navigator.locks?.request) {
      return navigator.locks.request(GUEST_CART_LOCK_KEY, () => task());
    }
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return task();
    }

    const owner = createMergeBatchId();
    const waitDeadline = Date.now() + CROSS_TAB_LOCK_TTL_MS;
    let acquired = false;

    while (Date.now() < waitDeadline) {
      try {
        const now = Date.now();
        const existingRaw = localStorage.getItem(GUEST_CART_LOCK_KEY);
        const existing = existingRaw ? JSON.parse(existingRaw) : null;
        if (!existing || !existing.expiresAt || existing.expiresAt <= now) {
          localStorage.setItem(
            GUEST_CART_LOCK_KEY,
            JSON.stringify({ owner, expiresAt: now + CROSS_TAB_LOCK_TTL_MS })
          );
          const verify = JSON.parse(localStorage.getItem(GUEST_CART_LOCK_KEY) || "null");
          if (verify?.owner === owner) {
            acquired = true;
            break;
          }
        }
      } catch {
        acquired = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 15));
    }

    if (!acquired) {
      // Stale lock recovery fallback if previous owner crashed right before verify
      try {
        localStorage.setItem(
          GUEST_CART_LOCK_KEY,
          JSON.stringify({ owner, expiresAt: Date.now() + CROSS_TAB_LOCK_TTL_MS })
        );
        acquired = true;
      } catch {
        acquired = false;
      }
    }

    try {
      return await task();
    } finally {
      if (acquired) {
        try {
          const current = JSON.parse(localStorage.getItem(GUEST_CART_LOCK_KEY) || "null");
          if (current?.owner === owner) {
            localStorage.removeItem(GUEST_CART_LOCK_KEY);
          }
        } catch {
          // ignore cleanup failure
        }
      }
    }
  };

  const execution = inProcessLockChain.then(runSerialized, runSerialized);
  inProcessLockChain = execution.then(
    () => undefined,
    () => undefined
  );
  return execution;
}

/**
 * Reconciles guest cart localStorage after a merge batch succeeds.
 * Always subtracts only the submitted IDs and quantities, preserving both concurrent edits
 * and any overflow items (> max batch size) not included in this batch.
 */
export function reconcileGuestCartAfterMerge(submittedItems) {
  if (typeof window === "undefined") return [];

  const readResult = readGuestCart();
  if (!readResult.ok) return [];

  const submittedQtyMap = new Map();
  for (const item of submittedItems || []) {
    const vid = item?.variantId?.toString();
    const qty = Number(item?.quantity) || 0;
    if (vid && qty > 0) {
      submittedQtyMap.set(vid, (submittedQtyMap.get(vid) || 0) + qty);
    }
  }

  const remaining = [];
  for (const entry of readResult.items) {
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

export async function getOrCreatePendingCartMergeBatch(maxBatchItems = 100) {
  return withGuestCartLock(() => {
    const revisionAtStart = getGuestCartRevision();
    const readResult = readGuestCart();
    const totalGuestCount = readResult.ok ? readResult.items.length : 0;

    let batch = getPendingCartMergeBatch();
    if (batch) {
      return { batch, revisionAtStart, totalGuestCount };
    }

    if (!readResult.ok || readResult.items.length === 0) {
      return { batch: null, revisionAtStart, totalGuestCount };
    }

    const itemsPayload = readResult.items.slice(0, maxBatchItems).map((i) => ({
      variantId: (i.variant?._id || i.variantId).toString(),
      quantity: i.quantity,
    }));

    batch = {
      batchId: createMergeBatchId(),
      items: itemsPayload,
      revision: revisionAtStart,
    };
    savePendingCartMergeBatch(batch);

    return { batch, revisionAtStart, totalGuestCount };
  });
}

export async function claimAndReconcilePendingCartBatch(expectedBatchId, onBeforeClear) {
  return withGuestCartLock(() => {
    const currentPending = getPendingCartMergeBatch();
    if (!currentPending || currentPending.batchId !== expectedBatchId) {
      return { claimed: false, remaining: getGuestCart() };
    }

    if (typeof onBeforeClear === "function") {
      onBeforeClear(getGuestCart());
    }

    const remaining = reconcileGuestCartAfterMerge(currentPending.items);
    clearPendingCartMergeBatch();
    return { claimed: true, remaining };
  });
}

// ── Wishlist Storage ──────────────────────────────────────────────────────────

export function readGuestWishlist() {
  if (typeof window === "undefined") return { ok: false, items: [] };
  try {
    const raw = localStorage.getItem(GUEST_WISHLIST_STORAGE_KEY);
    if (!raw) return { ok: true, items: [] };
    const parsed = JSON.parse(raw);
    return {
      ok: true,
      items: Array.isArray(parsed) ? parsed.filter(isValidGuestWishlistEntry) : [],
    };
  } catch (err) {
    console.error("Failed to read guest wishlist from localStorage:", err);
    return { ok: false, items: [] };
  }
}

export function getGuestWishlist() {
  return readGuestWishlist().items;
}

export function getGuestWishlistRevision() {
  return buildRevisionToken(GUEST_WISHLIST_STORAGE_KEY, GUEST_WISHLIST_REVISION_KEY);
}

export function saveGuestWishlist(products) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GUEST_WISHLIST_STORAGE_KEY, JSON.stringify(products));
    bumpRevision(GUEST_WISHLIST_REVISION_KEY);
    emitGuestStorageEvent("guestWishlistChanged");
  } catch (err) {
    console.error("Failed to save guest wishlist to localStorage:", err);
  }
}

export function clearGuestWishlist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GUEST_WISHLIST_STORAGE_KEY);
    bumpRevision(GUEST_WISHLIST_REVISION_KEY);
    emitGuestStorageEvent("guestWishlistChanged");
  } catch (err) {
    console.error("Failed to clear guest wishlist in localStorage:", err);
  }
}

/**
 * Reconciles guest wishlist localStorage after a merge batch succeeds.
 * Always filters out only the submitted product IDs so both concurrent additions
 * and unsubmitted overflow items (> max batch size) remain intact.
 */
export function reconcileGuestWishlistAfterMerge(submittedProductIds) {
  if (typeof window === "undefined") return [];

  const readResult = readGuestWishlist();
  if (!readResult.ok) return [];

  const mergedIds = new Set((submittedProductIds || []).map((id) => id.toString()));
  const remaining = readResult.items.filter((p) => !mergedIds.has((p._id || p).toString()));

  if (remaining.length === 0) {
    clearGuestWishlist();
  } else {
    saveGuestWishlist(remaining);
  }
  return remaining;
}

