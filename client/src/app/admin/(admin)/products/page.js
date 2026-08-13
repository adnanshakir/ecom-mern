"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Loader2, MoreVertical, Plus, Trash2, CheckSquare, Square } from "lucide-react";

import { useProducts } from "@/hooks/admin/useProducts";
import { useCategories } from "@/hooks/admin/useCategories";
import { useBrands } from "@/hooks/admin/useBrands";
import { CreateProductDialog } from "@/components/admin/products/CreateProductDialog";
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
import { ProductCard } from "@/components/admin/products/ProductCard";

const CAN_WRITE_ROLES = ["super_admin", "admin"];
const STATUS_OPTIONS = ["draft", "active", "archived"];

export default function ProductsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const role = useSelector((state) => state.auth.user?.role);
  const canWrite = CAN_WRITE_ROLES.includes(role);

  const {
    products,
    pagination,
    loading,
    error,
    filters,
    setFilter,
    setPage,
    removeProduct,
    fetchProducts,
    bulkUpdate,
    bulkDelete,
  } = useProducts();
  const { categories } = useCategories();
  const { brands } = useBrands();

  // The list endpoint may or may not populate category/brand — this map
  // covers both cases so names still resolve when only an ID comes back.
  const categoryById = Object.fromEntries(categories.map((c) => [c._id, c.name]));
  const brandById = Object.fromEntries(brands.map((b) => [b._id, b.name]));

  const resolveName = (field, map) => (field && typeof field === "object" ? field.name : map[field] || "—");

  const selectionActive = isSelecting || selectedIds.length > 0;

  const toggleSelectAll = () => {
    if (selectedIds.length === products.length && products.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p._id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkStatusChange = async (status) => {
    if (selectedIds.length === 0) return;
    await bulkUpdate(selectedIds, { status });
    setSelectedIds([]);
    setIsSelecting(false);
  };

  const handleBulkFeaturedChange = async (featured) => {
    if (selectedIds.length === 0) return;
    await bulkUpdate(selectedIds, { featured });
    setSelectedIds([]);
    setIsSelecting(false);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Delete ${selectedIds.length} selected products and their variants?`)) {
      await bulkDelete(selectedIds);
      setSelectedIds([]);
      setIsSelecting(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Products</h1>
      </div>

      <div className="flex flex-wrap justify-between gap-2">
        <div className="flex gap-2">
          <Input
            placeholder="Search products..."
            defaultValue={filters.search}
            className="w-56"
            onKeyDown={(e) => {
              if (e.key === "Enter") setFilter("search", e.currentTarget.value);
            }}
          />

          <Select value={filters.category || "all"} onValueChange={(v) => setFilter("category", v === "all" ? "" : v)}>
            <SelectTrigger className="w-40">
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
            <SelectTrigger className="w-40">
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
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New product
          </Button>

          {canWrite && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" title="Options and bulk actions">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
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
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {canWrite && selectionActive && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">{selectedIds.length} selected</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSelectAll}
              className="h-7 px-2 text-xs"
            >
              {selectedIds.length === products.length && products.length > 0 ? "Deselect all" : "Select all on page"}
            </Button>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={() => handleBulkStatusChange("active")} className="h-7 text-xs">
                Set Active
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkStatusChange("draft")} className="h-7 text-xs">
                Set Draft
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkStatusChange("archived")} className="h-7 text-xs">
                Set Archived
              </Button>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="h-7 text-xs">
                Delete ({selectedIds.length})
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsSelecting(false);
              setSelectedIds([]);
            }}
            className="h-7 px-2 text-xs text-muted-foreground"
          >
            Cancel
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading products...
        </div>
      )}

      {!loading && error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.length === 0 && <p className="col-span-full text-sm text-muted-foreground">No products found.</p>}
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                categoryName={resolveName(product.category, categoryById)}
                brandName={resolveName(product.brand, brandById)}
                canWrite={canWrite}
                onDelete={removeProduct}
                selectable={canWrite && selectionActive}
                selected={selectedIds.includes(product._id)}
                onToggleSelect={toggleSelectOne}
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {pagination.page} of {pagination.pages || 1} ({pagination.total} total)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page <= 1}
                onClick={() => setPage(filters.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page >= (pagination.pages || 1)}
                onClick={() => setPage(filters.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <CreateProductDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={fetchProducts} />
    </div>
  );
}

