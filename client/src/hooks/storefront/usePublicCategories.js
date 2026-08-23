"use client";

import { useState, useEffect } from "react";
import { getPublicCategories } from "@/services/storefront/publicCatalog";

export function usePublicCategories(params) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const paramsKey = params ? JSON.stringify(params) : "";

  useEffect(() => {
    setLoading(true);
    getPublicCategories(params)
      .then(({ data }) => setCategories(data.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load categories"))
      .finally(() => setLoading(false));
  }, [paramsKey]);

  return { categories, loading, error };
}