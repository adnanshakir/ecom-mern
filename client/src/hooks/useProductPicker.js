"use client";

import { useState, useEffect, useCallback } from "react";
import { getProducts } from "@/services/products";

const LIMIT = 10;

export function useProductPicker() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    getProducts({ search: search || undefined, page, limit: LIMIT })
      .then(({ data }) => {
        setProducts(data.data);
        setPagination(data.pagination);
      })
      .finally(() => setLoading(false));
  }, [search, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const updateSearch = (value) => {
    setSearch(value);
    setPage(1); // reset to page 1 on a new search
  };

  return { products, pagination, loading, search, setSearch: updateSearch, page, setPage };
}