"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "ecommerce_recently_viewed";
const MAX_ITEMS = 12;

/**
 * Extracts a lightweight snapshot of product data for local storage display
 */
const createProductSnapshot = (product) => {
  if (!product || !product._id) return null;
  return {
    _id: product._id,
    name: product.name,
    slug: product.slug,
    description: product.description || "",
    images: product.images || [],
    variants: product.variants || [],
    brand: product.brand ? { _id: product.brand._id, name: product.brand.name } : null,
    category: product.category ? { _id: product.category._id, name: product.category.name, slug: product.category.slug } : null,
    viewedAt: Date.now(),
  };
};

export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  // Load from localStorage on mount and register listener for multi-tab sync
  useEffect(() => {
    const loadItems = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setRecentlyViewed(parsed);
          }
        }
      } catch (err) {
        console.error("Failed to read recently viewed products from localStorage", err);
      }
    };

    loadItems();

    const handleCustomEvent = () => loadItems();
    window.addEventListener("recentlyViewedChanged", handleCustomEvent);
    window.addEventListener("storage", handleCustomEvent);

    return () => {
      window.removeEventListener("recentlyViewedChanged", handleCustomEvent);
      window.removeEventListener("storage", handleCustomEvent);
    };
  }, []);

  // Add or update a product in recently viewed
  const addRecentlyViewed = useCallback((product) => {
    const snapshot = createProductSnapshot(product);
    if (!snapshot) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let list = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(list)) list = [];

      // Filter out existing instance of this product
      list = list.filter((item) => item._id !== snapshot._id);

      // Prepend newest item
      list.unshift(snapshot);

      // Cap at MAX_ITEMS
      if (list.length > MAX_ITEMS) {
        list = list.slice(0, MAX_ITEMS);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      setRecentlyViewed(list);

      // Notify other components/tabs
      window.dispatchEvent(new Event("recentlyViewedChanged"));
    } catch (err) {
      console.error("Failed to save recently viewed product to localStorage", err);
    }
  }, []);

  const clearRecentlyViewed = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setRecentlyViewed([]);
      window.dispatchEvent(new Event("recentlyViewedChanged"));
    } catch (err) {
      console.error("Failed to clear recently viewed products", err);
    }
  }, []);

  return {
    recentlyViewed,
    addRecentlyViewed,
    clearRecentlyViewed,
  };
}
