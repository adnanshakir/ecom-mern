"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2, PackageX } from "lucide-react";
import { usePublicProducts } from "@/hooks/storefront/usePublicProducts";
import { usePublicCategories } from "@/hooks/storefront/usePublicCategories";
import { ProductCard } from "@/components/storefront/products/ProductCard";
import { Button } from "@/components/ui/button";

export function PopularProductsSection() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const scrollContainerRef = useRef(null);
  const pillsRef = useRef(null);

  // Dynamic masking & arrow visibility
  const [showLeftMask, setShowLeftMask] = useState(false);
  const [showRightMask, setShowRightMask] = useState(true);

  const [showPillsLeftMask, setShowPillsLeftMask] = useState(false);
  const [showPillsRightMask, setShowPillsRightMask] = useState(true);

  const { categories } = usePublicCategories();

  const { products, loading, error } = usePublicProducts({
    category: selectedCategory,
    limit: 12,
  });

  const topCategories = categories.filter((cat) => !cat.parent);

  const checkProductsScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftMask(scrollLeft > 5);
      setShowRightMask(scrollLeft < scrollWidth - clientWidth - 5);
    }
  }, []);

  const checkPillsScroll = useCallback(() => {
    if (pillsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = pillsRef.current;
      setShowPillsLeftMask(scrollLeft > 5);
      setShowPillsRightMask(scrollLeft < scrollWidth - clientWidth - 5);
    }
  }, []);

  useEffect(() => {
    checkProductsScroll();
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener("scroll", checkProductsScroll);
      window.addEventListener("resize", checkProductsScroll);
      return () => {
        el.removeEventListener("scroll", checkProductsScroll);
        window.removeEventListener("resize", checkProductsScroll);
      };
    }
  }, [products, checkProductsScroll]);

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

  const handleScroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -320 : 320;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <section className="space-y-6">
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
          <Link href="/category" className="flex items-center gap-1">
            <span>View All Products</span>
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>

      {/* Category Filter Pills with Dynamic Subtle White-Masking */}
      <div className="relative">
        {/* Subtle Left Masking Overlay (only visible after scrolling) */}
        <div
          className={`pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-6 sm:w-10 bg-gradient-to-r from-background via-background/50 to-transparent transition-opacity duration-300 ${
            showPillsLeftMask ? "opacity-100" : "opacity-0"
          }`}
        />
        {/* Subtle Right Masking Overlay */}
        <div
          className={`pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-6 sm:w-10 bg-gradient-to-l from-background via-background/50 to-transparent transition-opacity duration-300 ${
            showPillsRightMask ? "opacity-100" : "opacity-0"
          }`}
        />

        <div
          ref={pillsRef}
          className="flex items-center gap-2 overflow-x-auto py-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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

      {/* Products Row (Scrollable on X axis with Dynamic Subtle White-Masking) */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="size-7 animate-spin text-[#033936]" />
          <p className="text-sm font-medium">Loading products...</p>
        </div>
      ) : error || products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <PackageX className="mb-2 size-10 text-muted-foreground/60" />
          <p className="text-sm font-medium">No products found in this category.</p>
        </div>
      ) : (
        <div className="group/products relative">
          {/* Subtle Left Masking Overlay (only visible after scrolling) */}
          <div
            className={`pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-8 sm:w-12 bg-gradient-to-r from-background via-background/60 to-transparent transition-opacity duration-300 ${
              showLeftMask ? "opacity-100" : "opacity-0"
            }`}
          />
          {/* Subtle Right Masking Overlay */}
          <div
            className={`pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-8 sm:w-12 bg-gradient-to-l from-background via-background/60 to-transparent transition-opacity duration-300 ${
              showRightMask ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Circular Arrow Buttons (Only visible on hover over cards row) */}
          {showLeftMask && (
            <button
              type="button"
              onClick={() => handleScroll("left")}
              aria-label="Scroll left"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 size-9 items-center justify-center rounded-full bg-white text-slate-900 border border-slate-200/80 shadow-md transition-all duration-200 hover:scale-110 active:scale-95 opacity-0 group-hover/products:opacity-100 flex"
            >
              <ChevronLeft className="size-5 stroke-[2.2]" />
            </button>
          )}
          {showRightMask && (
            <button
              type="button"
              onClick={() => handleScroll("right")}
              aria-label="Scroll right"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 size-9 items-center justify-center rounded-full bg-white text-slate-900 border border-slate-200/80 shadow-md transition-all duration-200 hover:scale-110 active:scale-95 opacity-0 group-hover/products:opacity-100 flex"
            >
              <ChevronRight className="size-5 stroke-[2.2]" />
            </button>
          )}

          {/* Scrollable Container */}
          <div
            ref={scrollContainerRef}
            className="flex items-stretch gap-4 sm:gap-6 overflow-x-auto py-2 px-1 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {products.slice(0, 12).map((product) => (
              <div key={product._id} className="w-[210px] xs:w-[230px] sm:w-[250px] shrink-0">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
