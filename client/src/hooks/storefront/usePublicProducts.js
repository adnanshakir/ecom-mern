"use client";

import { useState, useEffect, useCallback } from "react";
import { getPublicProducts } from "@/services/storefront/publicCatalog";

export function usePublicProducts({ category, search, limit = 12 } = {}) {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [page, setPage] = useState(1);
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
    })
      .then(({ data }) => {
        setProducts(data.data);
        setPagination(data.pagination);
      })
      .catch((err) => setError(err.response?.data?.message || "Failed to load products"))
      .finally(() => setLoading(false));
  }, [category, search, page, limit]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [category, search]);

  return { products, pagination, page, setPage, loading, error };
}