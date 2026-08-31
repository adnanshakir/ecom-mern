"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export function ProductPaginationBar({
  pagination,
  filters,
  setFilter,
  setPage,
  productsLength,
  limitOptions,
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-muted-foreground pt-2">
      <div className="flex items-center gap-3">
        <span>
          Showing {productsLength > 0 ? (pagination.page - 1) * (filters.limit || 20) + 1 : 0} -{" "}
          {Math.min(pagination.page * (filters.limit || 20), pagination.total)} of {pagination.total} products
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs">Per page:</span>
          <Select value={String(filters.limit || 20)} onValueChange={(v) => setFilter("limit", Number(v))}>
            <SelectTrigger className="h-8 w-23.75 text-xs">
              <SelectValue placeholder="Limit">{filters.limit || 20} / page</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {limitOptions.map((l) => (
                <SelectItem key={l.value} value={l.value} className="text-xs">
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPage(pagination.page - 1)}>
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.page >= pagination.pages}
          onClick={() => setPage(pagination.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
