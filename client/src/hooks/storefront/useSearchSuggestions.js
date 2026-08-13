"use client";

import { useState, useEffect } from "react";
import { getSearchSuggestions } from "@/services/storefront/publicCatalog";
import { useDebouncedValue } from "@/hooks/shared/useDebouncedValue";

export function useSearchSuggestions(searchTerm) {
  const debouncedQuery = useDebouncedValue(searchTerm?.trim() || "", 300);
  const [suggestions, setSuggestions] = useState({ products: [], categories: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setSuggestions({ products: [], categories: [] });
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    getSearchSuggestions(debouncedQuery)
      .then(({ data }) => {
        if (isMounted) {
          setSuggestions(data.data || { products: [], categories: [] });
        }
      })
      .catch(() => {
        if (isMounted) {
          setSuggestions({ products: [], categories: [] });
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery]);

  return { suggestions, loading, query: debouncedQuery };
}
