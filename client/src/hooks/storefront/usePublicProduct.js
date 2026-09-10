"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getPublicProductBySlug } from "@/services/storefront/publicCatalog";

export function usePublicProduct(slug, initialData = null) {
  const [product, setProduct] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(null);
  const hasFetched = useRef(!!initialData);

  const fetchProduct = useCallback(() => {
    if (!slug) return;
    if (!hasFetched.current) setLoading(true);
    getPublicProductBySlug(slug)
      .then(({ data }) => {
        setProduct(data.data);
        hasFetched.current = true;
      })
      .catch((err) => setError(err.response?.data?.message || "Product not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!initialData) {
      fetchProduct();
    }
  }, [fetchProduct, initialData]);

  return { product, loading, error };
}