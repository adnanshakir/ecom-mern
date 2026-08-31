"use client";

import { useState, useEffect, Suspense } from "react";
import { useSelector } from "react-redux";
import { Loader2 } from "lucide-react";

import { useDebouncedValue } from "@/hooks/shared/useDebouncedValue";
import { useProducts } from "@/hooks/admin/useProducts";
import { useCategories } from "@/hooks/admin/useCategories";
import { useBrands } from "@/hooks/admin/useBrands";
import { CreateProductDialog } from "@/components/admin/products/CreateProductDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ProductCard } from "@/components/admin/products/ProductCard";
import { ProductTableToolbar } from "@/components/admin/products/ProductTableToolbar";
import { ProductBulkActionsBar } from "@/components/admin/products/ProductBulkActionsBar";
import { ProductPaginationBar } from "@/components/admin/products/ProductPaginationBar";

const CAN_WRITE_ROLES = ["super_admin", "admin"];
const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];
const LIMIT_OPTIONS = [
  { value: "10", label: "10 per page" },
  { value: "20", label: "20 per page" },
  { value: "50", label: "50 per page" },
  { value: "100", label: "100 per page" },
];

function ProductsContent() {
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
    confirmState,
    handleConfirm,
    handleCancel,
  } = useProducts();

  const [searchTerm, setSearchTerm] = useState(filters.search || "");
  const debouncedSearch = useDebouncedValue(searchTerm, 400);

  useEffect(() => {
    if (debouncedSearch !== (filters.search || "")) {
      setFilter("search", debouncedSearch);
    }
  }, [debouncedSearch, filters.search, setFilter]);

  const { categories } = useCategories();
  const { brands } = useBrands();

  const categoryById = Object.fromEntries(categories.map((c) => [c._id, c.name]));
  const brandById = Object.fromEntries(brands.map((b) => [b._id, b.name]));

  const resolveName = (field, map) => (field && typeof field === "object" ? field.name : map[field] || "—");

  const selectionActive = isSelecting || selectedIds.length > 0;
  const activeFilterCount = [
    filters.category,
    filters.brand,
    filters.status,
    filters.limit && filters.limit !== 20 ? filters.limit : null,
  ].filter(Boolean).length;

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

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    bulkDelete(selectedIds);
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Products</h1>
      </div>

      <ProductTableToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filters={filters}
        setFilter={setFilter}
        categories={categories}
        brands={brands}
        categoryById={categoryById}
        brandById={brandById}
        activeFilterCount={activeFilterCount}
        canWrite={canWrite}
        setCreateOpen={setCreateOpen}
        selectionActive={selectionActive}
        selectedIds={selectedIds}
        products={products}
        setIsSelecting={setIsSelecting}
        setSelectedIds={setSelectedIds}
        toggleSelectAll={toggleSelectAll}
        handleBulkStatusChange={handleBulkStatusChange}
        handleBulkFeaturedChange={handleBulkFeaturedChange}
        handleBulkDelete={handleBulkDelete}
        statusOptions={STATUS_OPTIONS}
        limitOptions={LIMIT_OPTIONS}
      />

      {canWrite && selectionActive && (
        <ProductBulkActionsBar
          selectedIds={selectedIds}
          productsLength={products.length}
          toggleSelectAll={toggleSelectAll}
          handleBulkStatusChange={handleBulkStatusChange}
          handleBulkDelete={handleBulkDelete}
          onCancel={() => {
            setIsSelecting(false);
            setSelectedIds([]);
          }}
        />
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

          <ProductPaginationBar
            pagination={pagination}
            filters={filters}
            setFilter={setFilter}
            setPage={setPage}
            productsLength={products.length}
            limitOptions={LIMIT_OPTIONS}
          />
        </>
      )}

      <CreateProductDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={fetchProducts} />
      <ConfirmDialog {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading products module...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
