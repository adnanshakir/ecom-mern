"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { getProducts, deleteProduct } from "@/services/admin/products";

const DEFAULT_LIMIT = 20;

export function useProducts() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters are derived from the URL so they're shareable/bookmarkable and
  // back/forward works naturally — not held in local component state.
  const filters = useMemo(
    () => ({
      search: searchParams.get("search") || "",
      category: searchParams.get("category") || "",
      brand: searchParams.get("brand") || "",
      status: searchParams.get("status") || "",
      featured: searchParams.get("featured") || "",
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || DEFAULT_LIMIT,
    }),
    [searchParams]
  );

  const updateParams = useCallback(
    (updates) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === "" || value === undefined || value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      // Any filter change other than page itself resets back to page 1.
      if (!("page" in updates)) {
        params.delete("page");
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const setFilter = (key, value) => updateParams({ [key]: value });
  const setPage = (page) => updateParams({ page });

  const fetchProducts = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = {
      page: filters.page,
      limit: filters.limit,
      ...(filters.search && { search: filters.search }),
      ...(filters.category && { category: filters.category }),
      ...(filters.brand && { brand: filters.brand }),
      ...(filters.status && { status: filters.status }),
      ...(filters.featured && { featured: filters.featured }),
    };

    getProducts(params)
      .then(({ data }) => {
        setProducts(data.data);
        setPagination(data.pagination);
      })
      .catch((err) =>
        setError(err.response?.data?.message || "Failed to load products")
      )
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const removeProduct = async (product) => {
    // Backend cascades to delete this product's variants too.
    if (!window.confirm(`Delete "${product.name}"? This also deletes its variants.`))
      return;

    try {
      await deleteProduct(product._id);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete product");
    }
  };

  return {
    products,
    pagination,
    loading,
    error,
    filters,
    setFilter,
    setPage,
    fetchProducts,
    removeProduct,
  };
}