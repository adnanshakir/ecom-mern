"use client";

import { MoreVertical, Plus, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductFilterSheet } from "@/components/admin/products/ProductFilterSheet";

export function ProductTableToolbar({
  searchTerm,
  setSearchTerm,
  filters,
  setFilter,
  categories,
  brands,
  categoryById,
  brandById,
  activeFilterCount,
  canWrite,
  setCreateOpen,
  selectionActive,
  selectedIds,
  products,
  setIsSelecting,
  setSelectedIds,
  toggleSelectAll,
  handleBulkStatusChange,
  handleBulkFeaturedChange,
  handleBulkDelete,
  statusOptions,
  limitOptions,
}) {
  const renderDropdownOptions = () => (
    <>
      {!selectionActive ? (
        <DropdownMenuItem onClick={() => setIsSelecting(true)}>
          <CheckSquare className="size-4" />
          Select products
        </DropdownMenuItem>
      ) : (
        <>
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            {selectedIds.length} of {products.length} selected
          </div>
          <DropdownMenuItem onClick={toggleSelectAll}>
            {selectedIds.length === products.length && products.length > 0 ? (
              <>
                <Square className="size-4" />
                Deselect all
              </>
            ) : (
              <>
                <CheckSquare className="size-4" />
                Select all on page ({products.length})
              </>
            )}
          </DropdownMenuItem>

          {selectedIds.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleBulkStatusChange("active")}>
                Set Status: Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatusChange("draft")}>
                Set Status: Draft
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatusChange("archived")}>
                Set Status: Archived
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleBulkFeaturedChange(true)}>
                Mark as Featured
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkFeaturedChange(false)}>
                Unmark Featured
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                onClick={handleBulkDelete}
              >
                Delete selected ({selectedIds.length})
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setIsSelecting(false);
              setSelectedIds([]);
            }}
          >
            Cancel selection
          </DropdownMenuItem>
        </>
      )}
    </>
  );

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      {/* Expanded Desktop Filters (Visible only on lg+ screens) */}
      <div className="hidden lg:flex flex-wrap items-center gap-2 flex-1">
        <Input
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-48 lg:w-56"
        />

        <Select value={filters.category || "all"} onValueChange={(v) => setFilter("category", v === "all" ? "" : v)}>
          <SelectTrigger className="w-36 lg:w-40">
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

        <Select value={filters.brand || "all"} onValueChange={(v) => setFilter("brand", v === "all" ? "" : v)}>
          <SelectTrigger className="w-36 lg:w-40">
            <SelectValue placeholder="Brand">{filters.brand ? brandById[filters.brand] : "All brands"}</SelectValue>
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

        <Select value={filters.status || "all"} onValueChange={(v) => setFilter("status", v === "all" ? "" : v)}>
          <SelectTrigger className="w-32 lg:w-36">
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

        <Select value={String(filters.limit || 20)} onValueChange={(v) => setFilter("limit", Number(v))}>
          <SelectTrigger className="w-32 lg:w-36">
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

      {/* Mobile & Medium Screen Compact Bar (< lg): Search + Single Filter Button + New product Button */}
      <div className="flex lg:hidden items-center gap-2 w-full">
        <Input
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-0"
        />

        <ProductFilterSheet
          filters={filters}
          setFilter={setFilter}
          categories={categories}
          brands={brands}
          categoryById={categoryById}
          brandById={brandById}
          activeFilterCount={activeFilterCount}
          statusOptions={statusOptions}
          limitOptions={limitOptions}
        />

        {canWrite && (
          <Button onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="size-4" />
            <span>New product</span>
          </Button>
        )}

        {canWrite && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 size-9" title="Options and bulk actions">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {renderDropdownOptions()}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Desktop Actions (Visible only on lg+ screens) */}
      <div className="hidden lg:flex items-center gap-2 shrink-0">
        {canWrite && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New product
          </Button>
        )}

        {canWrite && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" title="Options and bulk actions">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {renderDropdownOptions()}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
