"use client";

import { useState, useEffect, useCallback } from "react";
import { getProduct } from "@/services/admin/products";

export function useProduct(productId) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProduct = useCallback(() => {
    if (!productId) return;
    setLoading(true);
    getProduct(productId)
      .then(({ data }) => setProduct(data.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load product"))
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  return { product, loading, error, refetch: fetchProduct };
}