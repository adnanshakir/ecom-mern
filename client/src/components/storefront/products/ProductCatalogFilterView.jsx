"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SlidersHorizontal,
  ChevronDown,
  X,
  Loader2,
  PackageX,
  RotateCcw,
  Check,
} from "lucide-react";
import { usePublicProducts } from "@/hooks/storefront/usePublicProducts";
import { usePublicCategories } from "@/hooks/storefront/usePublicCategories";
import { buildChildrenMap } from "@/lib/categoryTree";
import { ProductCard } from "@/components/storefront/products/ProductCard";
import { Breadcrumbs } from "@/components/storefront/layout/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ProductCatalogFilterView({
  initialCategory = null,
  initialSearch = "",
  titleOverride = null,
  breadcrumbs = [],
}) {
  const router = useRouter();
  const { categories } = usePublicCategories();

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sort, setSort] = useState("newest");

  // Confirmed Filter State (used for API calls)
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // Temporary Input State for Price Filter (Only submitted on "Apply" click)
  const [tempMinPrice, setTempMinPrice] = useState("");
  const [tempMaxPrice, setTempMaxPrice] = useState("");

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Section Collapse States
  const [categoriesSectionOpen, setCategoriesSectionOpen] = useState(true);
  const [priceSectionOpen, setPriceSectionOpen] = useState(true);
  const [expandedParents, setExpandedParents] = useState({});

  // Pagination & Cumulative Product Storage
  const [allProducts, setAllProducts] = useState([]);
  const [page, setPage] = useState(1);
  const LIMIT = 50; // Batch size of 50 products

  // Sentinel ref for automatic infinite scroll
  const loadMoreRef = useRef(null);

  // Fetch filtered products
  const { products, pagination, loading, error } = usePublicProducts({
    category: selectedCategory,
    search: initialSearch,
    sort,
    minPrice,
    maxPrice,
    page,
    limit: LIMIT,
  });

  // Whenever filter parameters change, reset page and clear cumulative list
  useEffect(() => {
    setPage(1);
    setAllProducts([]);
  }, [selectedCategory, initialSearch, sort, minPrice, maxPrice]);

  // Append incoming products to allProducts when fetched
  useEffect(() => {
    if (products && products.length > 0) {
      setAllProducts((prev) => {
        if (page === 1) return products;
        // Avoid duplicate items when paginating
        const existingIds = new Set(prev.map((p) => p._id));
        const newItems = products.filter((p) => !existingIds.has(p._id));
        return [...prev, ...newItems];
      });
    } else if (page === 1 && !loading) {
      setAllProducts([]);
    }
  }, [products, page, loading]);

  const totalCount = pagination.total || allProducts.length;
  const progressPercent = totalCount > 0 ? Math.min(100, Math.round((allProducts.length / totalCount) * 100)) : 0;

  // Automatic infinite scroll when user scrolls near the end
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !loading && allProducts.length < totalCount) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1, rootMargin: "250px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [loading, allProducts.length, totalCount]);

  const toggleParent = (catId) => {
    setExpandedParents((prev) => ({
      ...prev,
      [catId]: prev[catId] === undefined ? false : !prev[catId],
    }));
  };

  const handleCategorySelect = (slugOrId) => {
    setSelectedCategory(slugOrId);
    if (!slugOrId) {
      router.push("/catalog/all");
    } else {
      router.push(`/catalog/${slugOrId}`);
    }
  };

  // Submit price filter on button click
  const handleApplyPriceFilter = () => {
    setMinPrice(tempMinPrice);
    setMaxPrice(tempMaxPrice);
  };

  const handleQuickPricePreset = (min, max) => {
    setTempMinPrice(min);
    setTempMaxPrice(max);
    setMinPrice(min);
    setMaxPrice(max);
  };

  const handleResetFilters = () => {
    handleCategorySelect(null);
    setTempMinPrice("");
    setTempMaxPrice("");
    setMinPrice("");
    setMaxPrice("");
    setSort("newest");
  };

  const childrenMap = buildChildrenMap(categories);
  const topCategories = categories.filter((c) => !c.parent);

  const currentCategoryObj = categories.find(
    (c) => c.slug === selectedCategory || c._id === selectedCategory
  );

  const hasActiveFilters = !!selectedCategory || !!minPrice || !!maxPrice || sort !== "newest";

  // Sidebar Filter Content helper (Render function to preserve input focus)
  const renderFilterSidebar = () => (
    <div className="space-y-6 text-xs">
      {/* Active Filters / Reset */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Active Filters
          </span>
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-xs font-semibold text-destructive hover:underline"
          >
            <RotateCcw className="size-3" /> Reset All
          </button>
        </div>
      )}

      {/* Categories Collapsable Section */}
      <div className="space-y-3 border-b border-border/60 pb-4">
        <button
          type="button"
          onClick={() => setCategoriesSectionOpen((prev) => !prev)}
          className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-wider text-foreground hover:text-[#033936] transition-colors"
        >
          <span>Categories</span>
          <ChevronDown
            className={`size-4 transition-transform duration-200 ${
              !categoriesSectionOpen ? "-rotate-90" : ""
            }`}
          />
        </button>

        {categoriesSectionOpen && (
          <div className="space-y-1 pt-1">
            <button
              type="button"
              onClick={() => handleCategorySelect(null)}
              className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left font-medium transition-colors ${
                !selectedCategory
                  ? "bg-[#033936] text-white"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <span>All Categories</span>
              {!selectedCategory && <Check className="size-3.5" />}
            </button>

            {topCategories.map((cat) => {
              const subcats = childrenMap.get(cat._id) || [];
              const isSelected =
                selectedCategory === cat.slug || selectedCategory === cat._id;
              const isParentExpanded = expandedParents[cat._id] !== false;

              return (
                <div key={cat._id} className="space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => handleCategorySelect(cat.slug || cat._id)}
                      className={`flex flex-1 items-center justify-between rounded-md px-2.5 py-1.5 text-left font-medium transition-colors ${
                        isSelected
                          ? "bg-[#033936] text-white"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      <span className="truncate">{cat.name}</span>
                      {subcats.length > 0 && (
                        <span className="text-[10px] opacity-75">({subcats.length})</span>
                      )}
                    </button>

                    {subcats.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleParent(cat._id)}
                        className="p-1.5 text-muted-foreground hover:text-foreground transition-transform"
                      >
                        <ChevronDown
                          className={`size-3.5 transition-transform duration-200 ${
                            !isParentExpanded ? "-rotate-90" : ""
                          }`}
                        />
                      </button>
                    )}
                  </div>

                  {subcats.length > 0 && isParentExpanded && (
                    <div className="ml-3 pl-2 border-l border-border/60 space-y-0.5 pt-0.5">
                      {subcats.map((sub) => {
                        const isSubSelected =
                          selectedCategory === sub.slug || selectedCategory === sub._id;
                        return (
                          <button
                            key={sub._id}
                            type="button"
                            onClick={() => handleCategorySelect(sub.slug || sub._id)}
                            className={`flex w-full items-center justify-between rounded-md px-2.5 py-1 text-left text-xs transition-colors ${
                              isSubSelected
                                ? "font-bold text-[#033936] bg-[#033936]/10"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span className="truncate">{sub.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Price Filter Collapsable Section with Done/Apply Button */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setPriceSectionOpen((prev) => !prev)}
          className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-wider text-foreground hover:text-[#033936] transition-colors"
        >
          <span>Price Filter</span>
          <ChevronDown
            className={`size-4 transition-transform duration-200 ${
              !priceSectionOpen ? "-rotate-90" : ""
            }`}
          />
        </button>

        {priceSectionOpen && (
          <div className="space-y-3 pt-1">
            {/* Min & Max Inputs (Updates temp state without live API calls) */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">
                  ₹
                </span>
                <Input
                  type="number"
                  placeholder="Min"
                  value={tempMinPrice}
                  onChange={(e) => setTempMinPrice(e.target.value)}
                  className="pl-6 text-xs h-8"
                />
              </div>
              <span className="text-xs text-muted-foreground font-bold">-</span>
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">
                  ₹
                </span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={tempMaxPrice}
                  onChange={(e) => setTempMaxPrice(e.target.value)}
                  className="pl-6 text-xs h-8"
                />
              </div>
            </div>

            {/* Slider updating temp state */}
            <div className="space-y-1.5 pt-1">
              <input
                type="range"
                min="0"
                max="10000"
                step="50"
                value={tempMaxPrice || 10000}
                onChange={(e) => setTempMaxPrice(e.target.value)}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-[#033936]"
              />
              <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                <span>₹{tempMinPrice || 0}</span>
                <span>₹{tempMaxPrice ? Number(tempMaxPrice).toLocaleString() : "10,000+"}</span>
              </div>
            </div>

            {/* Done / Apply Submit Button */}
            <Button
              type="button"
              size="sm"
              onClick={handleApplyPriceFilter}
              className="w-full bg-[#033936] text-white hover:bg-[#022826] text-xs h-8 rounded-md font-semibold"
            >
              Apply Filter
            </Button>

            {/* Quick Presets */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleQuickPricePreset("", "500")}
                className="rounded-md border border-border bg-transparent px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-[#033936] hover:text-foreground"
              >
                Under ₹500
              </button>
              <button
                type="button"
                onClick={() => handleQuickPricePreset("500", "2000")}
                className="rounded-md border border-border bg-transparent px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-[#033936] hover:text-foreground"
              >
                ₹500 - ₹2,000
              </button>
              <button
                type="button"
                onClick={() => handleQuickPricePreset("2000", "5000")}
                className="rounded-md border border-border bg-transparent px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-[#033936] hover:text-foreground"
              >
                ₹2,000 - ₹5,000
              </button>
              <button
                type="button"
                onClick={() => handleQuickPricePreset("5000", "")}
                className="rounded-md border border-border bg-transparent px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-[#033936] hover:text-foreground"
              >
                Above ₹5,000
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Dynamic Title & Breadcrumbs based on active selectedCategory
  const pageTitle =
    selectedCategory === null
      ? "All Wholesale Products"
      : currentCategoryObj
      ? currentCategoryObj.name
      : initialSearch
      ? `${totalCount} Results found for "${initialSearch}"`
      : titleOverride || "All Wholesale Products";

  const activeBreadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Catalog", href: "/catalog" },
    ...(selectedCategory && currentCategoryObj
      ? [{ label: currentCategoryObj.name }]
      : selectedCategory
      ? [{ label: selectedCategory }]
      : initialSearch
      ? [{ label: `Search: "${initialSearch}"` }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbs.length > 0 && selectedCategory !== null ? breadcrumbs : activeBreadcrumbs} />

      {/* Main Area Layout: Left Sidebar + Right Gallery Grid */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Desktop Sidebar */}
        <aside className="hidden lg:block w-64 xl:w-72 shrink-0 space-y-6">
          <div className="space-y-6 pr-2">
            {renderFilterSidebar()}
          </div>
        </aside>

        {/* Right Content Column */}
        <main className="flex-1 space-y-6">
          {/* Header Row: Title, Mobile Filter Toggle & Simplified Sort Dropdown */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                {pageTitle}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Showing {allProducts.length} of {totalCount} products
              </p>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3">
              {/* Mobile Filter Button */}
              <Dialog open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden flex items-center gap-1.5">
                    <SlidersHorizontal className="size-4" />
                    <span>Filters</span>
                    {hasActiveFilters && (
                      <span className="flex size-2 rounded-full bg-[#033936]" />
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xs max-h-[85vh] overflow-y-auto p-5">
                  <DialogHeader className="mb-2 text-left">
                    <DialogTitle>Filters</DialogTitle>
                  </DialogHeader>
                  {renderFilterSidebar()}
                </DialogContent>
              </Dialog>

              {/* Simplified Sort Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground shrink-0">
                  Sort By:
                </span>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="w-44 text-xs h-9">
                    <SelectValue>
                      {sort === "featured"
                        ? "Featured Products"
                        : sort === "price_asc"
                        ? "Price: Low to High"
                        : sort === "price_desc"
                        ? "Price: High to Low"
                        : "Newest First"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="featured">Featured Products</SelectItem>
                    <SelectItem value="price_asc">Price: Low to High</SelectItem>
                    <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Active Filter Pills Bar */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 bg-muted/30 p-2.5 rounded-lg border text-xs">
              <span className="font-semibold text-muted-foreground">Active:</span>

              {selectedCategory && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#033936] px-3 py-1 text-white text-[11px] font-medium">
                  Category: {currentCategoryObj?.name || selectedCategory}
                  <button type="button" onClick={() => setSelectedCategory(null)}>
                    <X className="size-3 hover:opacity-75" />
                  </button>
                </span>
              )}

              {(minPrice || maxPrice) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#033936] px-3 py-1 text-white text-[11px] font-medium">
                  Price: ₹{minPrice || 0} - ₹{maxPrice || "Max"}
                  <button
                    type="button"
                    onClick={() => {
                      setTempMinPrice("");
                      setTempMaxPrice("");
                      setMinPrice("");
                      setMaxPrice("");
                    }}
                  >
                    <X className="size-3 hover:opacity-75" />
                  </button>
                </span>
              )}

              {sort !== "newest" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#033936] px-3 py-1 text-white text-[11px] font-medium">
                  Sort: {sort === "featured" ? "Featured Products" : sort === "price_asc" ? "Price: Low to High" : "Price: High to Low"}
                  <button type="button" onClick={() => setSort("newest")}>
                    <X className="size-3 hover:opacity-75" />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={handleResetFilters}
                className="ml-auto text-[11px] font-semibold text-destructive hover:underline"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Product Gallery Grid */}
          {loading && page === 1 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
              <Loader2 className="size-8 animate-spin text-[#033936]" />
              <p className="text-sm font-medium">Loading catalog products...</p>
            </div>
          ) : error || allProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-20 text-center text-muted-foreground">
              <PackageX className="mb-3 size-12 text-muted-foreground/50" />
              <h3 className="text-base font-bold text-foreground">No products found</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                {selectedCategory
                  ? `No items found under "${currentCategoryObj?.name || selectedCategory}". Try exploring other categories or clearing your filters.`
                  : "No items match your current filter criteria. Try adjusting your search term or price filters."}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="mt-4 rounded-full border-[#033936] text-[#033936]"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-10">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {allProducts.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>

              {/* Product Gallery Thinner Progress Line & Automatic Infinite Scroll Sentinel */}
              <div className="flex flex-col items-center justify-center gap-3 pt-6 border-t">
                {/* Count Indicator Header (e.g. Showing 1 - 50 of 116 total) */}
                <p className="text-xs font-medium text-muted-foreground tracking-wide">
                  Showing 1 - {allProducts.length} of {totalCount} total
                </p>

                {/* Thin Red Progress Line */}
                <div className="w-72 max-w-full h-[2px] rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-red-600 transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Automatic Infinite Scroll Trigger Sentinel */}
                <div ref={loadMoreRef} className="h-8 flex items-center justify-center pt-2">
                  {loading && page > 1 && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <Loader2 className="size-4 animate-spin text-[#033936]" />
                      <span>Loading more products...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
