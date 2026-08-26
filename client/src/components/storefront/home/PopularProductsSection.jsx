"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronRight, Loader2, PackageX } from "lucide-react";
import { usePublicProducts } from "@/hooks/storefront/usePublicProducts";
import { usePublicCategories } from "@/hooks/storefront/usePublicCategories";
import { ProductCard } from "@/components/storefront/products/ProductCard";
import { Button } from "@/components/ui/button";

export function PopularProductsSection() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const pillsRef = useRef(null);

  // Dynamic masking for category pills
  const [showPillsLeftMask, setShowPillsLeftMask] = useState(false);
  const [showPillsRightMask, setShowPillsRightMask] = useState(true);

  const { categories } = usePublicCategories();

  const { products, loading, error } = usePublicProducts({
    category: selectedCategory,
    limit: 12,
  });

  const topCategories = (categories || []).filter((cat) => !cat.parent);

  const checkPillsScroll = useCallback(() => {
    if (pillsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = pillsRef.current;
      setShowPillsLeftMask(scrollLeft > 5);
      setShowPillsRightMask(scrollLeft < scrollWidth - clientWidth - 5);
    }
  }, []);

  useEffect(() => {
    checkPillsScroll();
    const el = pillsRef.current;
    if (el) {
      el.addEventListener("scroll", checkPillsScroll);
      window.addEventListener("resize", checkPillsScroll);
      return () => {
        el.removeEventListener("scroll", checkPillsScroll);
        window.removeEventListener("resize", checkPillsScroll);
      };
    }
  }, [topCategories, checkPillsScroll]);

  return (
    <section className="space-y-6 w-full min-w-0">
      {/* Header & View All */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Popular Products
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Top trending items and best wholesale deals
          </p>
        </div>

        <Button variant="outline" size="sm" asChild className="self-start rounded-full border-[#033936] text-[#033936] hover:bg-[#033936] hover:text-white sm:self-auto">
          <Link href="/category/all" className="flex items-center gap-1">
            <span>View All Products</span>
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>

      {/* Category Filter Pills with Dynamic Subtle Masking */}
      <div className="relative">
        <div
          className={`pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-6 sm:w-10 bg-linear-to-r from-background via-background/50 to-transparent transition-opacity duration-300 ${
            showPillsLeftMask ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-6 sm:w-10 bg-linear-to-l from-background via-background/50 to-transparent transition-opacity duration-300 ${
            showPillsRightMask ? "opacity-100" : "opacity-0"
          }`}
        />

        <div
          ref={pillsRef}
          className="flex items-center gap-2 overflow-x-auto py-1 px-1 scrollbar-none [&::-webkit-scrollbar]:hidden"
        >
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
              selectedCategory === null
                ? "bg-[#033936] text-white shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            All
          </button>

          {topCategories.map((cat) => {
            const isSelected = selectedCategory === cat.slug || selectedCategory === cat._id;
            return (
              <button
                key={cat._id}
                type="button"
                onClick={() => setSelectedCategory(cat.slug || cat._id)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-[#033936] text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Grid Layout */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="size-7 animate-spin text-[#033936]" />
          <p className="text-sm font-medium">Loading popular products...</p>
        </div>
      ) : error || products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground border rounded-2xl bg-muted/20">
          <PackageX className="mb-2 size-10 text-muted-foreground/60" />
          <p className="text-sm font-medium">No products found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:gap-6">
          {products.slice(0, 10).map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
