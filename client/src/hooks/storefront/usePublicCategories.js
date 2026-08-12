"use client";

import { useState, useEffect } from "react";
import { getPublicCategories } from "@/services/storefront/publicCatalog";

export function usePublicCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getPublicCategories()
      .then(({ data }) => setCategories(data.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load categories"))
      .finally(() => setLoading(false));
  }, []);

  return { categories, loading, error };
}