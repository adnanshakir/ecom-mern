"use client";

import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export function ProductFilterSheet({
  filters,
  setFilter,
  categories,
  brands,
  categoryById,
  brandById,
  activeFilterCount,
  statusOptions,
  limitOptions,
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="shrink-0 gap-1.5 px-3">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <span className="flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[360px] p-6 flex flex-col justify-between">
        <div className="space-y-5">
          <SheetHeader className="p-0 space-y-1">
            <SheetTitle className="text-lg font-bold">Filter Products</SheetTitle>
            <SheetDescription>Refine product catalog listing</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</label>
              <Select
                value={filters.category || "all"}
                onValueChange={(v) => setFilter("category", v === "all" ? "" : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Category">
                    {filters.category ? categoryById[filters.category] : "All categories"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Brand</label>
              <Select value={filters.brand || "all"} onValueChange={(v) => setFilter("brand", v === "all" ? "" : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Brand">
                    {filters.brand ? brandById[filters.brand] : "All brands"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All brands</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b._id} value={b._id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
              <Select value={filters.status || "all"} onValueChange={(v) => setFilter("status", v === "all" ? "" : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status">
                    {filters.status
                      ? statusOptions.find((s) => s.value === filters.status)?.label || filters.status
                      : "All statuses"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Per Page</label>
              <Select value={String(filters.limit || 20)} onValueChange={(v) => setFilter("limit", Number(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Per page">{filters.limit || 20} per page</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {limitOptions.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              className="w-full gap-2 text-xs"
              onClick={() => {
                setFilter("category", "");
                setFilter("brand", "");
                setFilter("status", "");
                setFilter("limit", 20);
              }}
            >
              <RotateCcw className="size-3.5" />
              Reset all filters
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
