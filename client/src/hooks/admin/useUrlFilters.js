"use client";

import { useCallback, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

/**
 * Reusable hook to sync search, pagination, and filter state with URL search parameters.
 *
 * @param {Object} defaultFilters - Object mapping filter keys to default values or URL param parsing rules
 * @param {number} defaultLimit   - Default pagination limit (default 20)
 */
export function useUrlFilters(defaultParamKeys = [], defaultLimit = 20) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => {
    const result = {
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || defaultLimit,
    };
    defaultParamKeys.forEach((key) => {
      result[key] = searchParams.get(key) || "";
    });
    return result;
  }, [searchParams, defaultParamKeys, defaultLimit]);

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

      // Reset to page 1 whenever any filter besides page itself changes
      if (!("page" in updates)) {
        params.delete("page");
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const setFilter = useCallback((key, value) => updateParams({ [key]: value }), [updateParams]);
  const setPage = useCallback((page) => updateParams({ page }), [updateParams]);

  return { filters, setFilter, setPage, updateParams };
}
