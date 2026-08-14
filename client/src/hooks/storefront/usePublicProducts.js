"use client";

import { useState, useEffect, useCallback } from "react";
import { getPublicProducts } from "@/services/storefront/publicCatalog";

export function usePublicProducts({ category, search, sort, minPrice, maxPrice, page = 1, limit = 12 } = {}) {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    setError(null);
    getPublicProducts({
      page,
      limit,
      ...(category && { category }),
      ...(search && { search }),
      ...(sort && { sort }),
      ...(minPrice !== undefined && minPrice !== "" && { minPrice }),
      ...(maxPrice !== undefined && maxPrice !== "" && { maxPrice }),
    })
      .then(({ data }) => {
        setProducts(data.data);
        setPagination(data.pagination);
      })
      .catch((err) => setError(err.response?.data?.message || "Failed to load products"))
      .finally(() => setLoading(false));
  }, [category, search, sort, minPrice, maxPrice, page, limit]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, pagination, loading, error };
}