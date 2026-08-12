"use client";

import { useState, useEffect, useCallback } from "react";
import { getPublicProductBySlug } from "@/services/storefront/publicCatalog";

export function usePublicProduct(slug) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProduct = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    getPublicProductBySlug(slug)
      .then(({ data }) => setProduct(data.data))
      .catch((err) => setError(err.response?.data?.message || "Product not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  return { product, loading, error };
}