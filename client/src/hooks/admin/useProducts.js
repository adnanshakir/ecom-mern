"use client";

import { useState, useEffect, useCallback } from "react";
import { getProducts, deleteProduct, bulkUpdateProducts, bulkDeleteProducts } from "@/services/admin/products";
import { useConfirm } from "@/hooks/useConfirm";
import { useUrlFilters } from "@/hooks/admin/useUrlFilters";

const DEFAULT_LIMIT = 20;
const PARAM_KEYS = ["search", "category", "brand", "status", "featured"];

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const { confirmState, requestConfirm, handleConfirm, handleCancel } = useConfirm();
  const { filters, setFilter, setPage } = useUrlFilters(PARAM_KEYS, DEFAULT_LIMIT);

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

  const removeProduct = (product) => {
    // Backend cascades to delete this product's variants too.
    requestConfirm({
      title: "Delete product?",
      description: `This will permanently delete "${product.name}" and all its variants.`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: async () => {
        await deleteProduct(product._id);
        fetchProducts();
      },
    });
  };

  const bulkUpdate = async (ids, updates) => {
    try {
      setActionError(null);
      await bulkUpdateProducts(ids, updates);
      fetchProducts();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to update selected products");
    }
  };

  const bulkDelete = (ids) => {
    requestConfirm({
      title: "Delete selected products?",
      description: `This will permanently delete ${ids.length} product(s) and all their variants.`,
      confirmLabel: `Delete ${ids.length}`,
      destructive: true,
      onConfirm: async () => {
        await bulkDeleteProducts(ids);
        fetchProducts();
      },
    });
  };

  return {
    products,
    pagination,
    loading,
    error,
    actionError,
    filters,
    setFilter,
    setPage,
    fetchProducts,
    removeProduct,
    bulkUpdate,
    bulkDelete,
    confirmState,
    handleConfirm,
    handleCancel,
  };
}