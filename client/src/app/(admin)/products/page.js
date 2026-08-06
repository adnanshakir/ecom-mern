"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useBrands } from "@/hooks/useBrands";
import { CreateProductDialog } from "@/components/products/CreateProductDialog";
import { EditProductDialog } from "@/components/products/EditProductDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";

const CAN_WRITE_ROLES = ["super_admin", "admin"];
const STATUS_OPTIONS = ["draft", "active", "archived"];

export default function ProductsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);

  const role = useSelector((state) => state.auth.user?.role);
  const canWrite = CAN_WRITE_ROLES.includes(role);

  const { products, pagination, loading, error, filters, setFilter, setPage, removeProduct, fetchProducts } =
    useProducts();
  const { categories } = useCategories();
  const { brands } = useBrands();

  // The list endpoint may or may not populate category/brand — this map
  // covers both cases so names still resolve when only an ID comes back.
  const categoryById = Object.fromEntries(categories.map((c) => [c._id, c.name]));
  const brandById = Object.fromEntries(brands.map((b) => [b._id, b.name]));

  const resolveName = (field, map) => (field && typeof field === "object" ? field.name : map[field] || "—");

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

        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          New product
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading products...
        </div>
      )}

      {!loading && error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Status</TableHead>
                {canWrite && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canWrite ? 5 : 4} className="text-muted-foreground">
                    No products found.
                  </TableCell>
                </TableRow>
              )}
              {products.map((product) => (
                <TableRow key={product._id}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell className="text-muted-foreground">{resolveName(product.category, categoryById)}</TableCell>
                  <TableCell className="text-muted-foreground">{resolveName(product.brand, brandById)}</TableCell>
                  <TableCell className="capitalize">{product.status}</TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setEditingProductId(product._id)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removeProduct(product)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

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

      <EditProductDialog
        productId={editingProductId}
        open={!!editingProductId}
        onOpenChange={(open) => !open && setEditingProductId(null)}
        onSaved={fetchProducts}
      />
    </div>
  );
}
