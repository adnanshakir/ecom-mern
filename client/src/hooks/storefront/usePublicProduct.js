"use client";

import { useState, useEffect, useCallback } from "react";
import { getPublicProductBySlug } from "@/services/storefront/publicCatalog";

export function usePublicProduct(slug, initialData = null) {
  const [product, setProduct] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(null);

  const fetchProduct = useCallback(() => {
    if (!slug) return;
    if (!product) setLoading(true);
    getPublicProductBySlug(slug)
      .then(({ data }) => setProduct(data.data))
      .catch((err) => setError(err.response?.data?.message || "Product not found"))
      .finally(() => setLoading(false));
  }, [slug, product]);

  useEffect(() => {
    if (!initialData) {
      fetchProduct();
    }
  }, [fetchProduct, initialData]);

  return { product, loading, error };
}