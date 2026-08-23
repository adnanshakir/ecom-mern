"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronRight, Loader2, PackageX } from "lucide-react";
import { usePublicProducts } from "@/hooks/storefront/usePublicProducts";
import { ProductCard } from "@/components/storefront/products/ProductCard";
import { Button } from "@/components/ui/button";
import { getDisplayPrice } from "@/lib/productPrice";

const BUDGET_OPTIONS = [
  { id: "200", label: "Under ₹200", maxPrice: 200 },
  { id: "500", label: "Under ₹500", maxPrice: 500 },
  { id: "1000", label: "Under ₹1000", maxPrice: 1000 },
  { id: "2000", label: "Under ₹2000", maxPrice: 2000 },
];

export function ShopByBudget() {
  const [selectedBudget, setSelectedBudget] = useState(BUDGET_OPTIONS[1]); // Default Under ₹500
  const pillsRef = useRef(null);

  const [showPillsLeftMask, setShowPillsLeftMask] = useState(false);
  const [showPillsRightMask, setShowPillsRightMask] = useState(true);

  const { products, loading, error } = usePublicProducts({
    maxPrice: selectedBudget.maxPrice,
    limit: 14,
  });

  // Strict client filter as fallback
  const filteredProducts = products.filter(
    (product) => getDisplayPrice(product.variants) <= selectedBudget.maxPrice
  );
  const displayProducts = (filteredProducts.length > 0 ? filteredProducts : products).slice(0, 14);

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
  }, [checkPillsScroll]);

  return (
    <section className="space-y-6 pt-4">
      {/* Header & View All */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>SHOP BY BUDGET</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl mt-0.5">
            Affordable Deals Within Your Budget
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Quality wholesale items curated under your price limit
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          asChild
          className="self-start rounded-full border-[#033936] text-[#033936] hover:bg-[#033936] hover:text-white sm:self-auto"
        >
          <Link href={`/category?maxPrice=${selectedBudget.maxPrice}`} className="flex items-center gap-1">
            <span>View All Deals</span>
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>

      {/* Budget Filter Pills with Dynamic Subtle White-Masking */}
      <div className="relative">
        <div
          className={`pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-6 sm:w-10 bg-gradient-to-r from-background via-background/50 to-transparent transition-opacity duration-300 ${
            showPillsLeftMask ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-6 sm:w-10 bg-gradient-to-l from-background via-background/50 to-transparent transition-opacity duration-300 ${
            showPillsRightMask ? "opacity-100" : "opacity-0"
          }`}
        />

        <div
          ref={pillsRef}
          className="flex items-center gap-2.5 overflow-x-auto py-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {BUDGET_OPTIONS.map((option) => {
            const isSelected = selectedBudget.id === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedBudget(option)}
                className={`shrink-0 rounded-full px-5 py-2 text-xs font-semibold transition-all duration-200 ${
                  isSelected
                    ? "bg-[#033936] text-white shadow-md scale-105"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Grid (12-14 items) */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="size-7 animate-spin text-[#033936]" />
          <p className="text-sm font-medium">Loading budget deals...</p>
        </div>
      ) : error || displayProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground border rounded-2xl bg-muted/20">
          <PackageX className="mb-2 size-10 text-muted-foreground/60" />
          <p className="text-sm font-medium">No products found under {selectedBudget.label}.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:gap-6">
            {displayProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>

          {/* See All / More Products Button */}
          <div className="flex justify-center pt-2">
            <Button
              asChild
              className="rounded-full bg-[#033936] px-8 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#022826] transition-all hover:gap-3"
            >
              <Link href={`/category?maxPrice=${selectedBudget.maxPrice}`} className="flex items-center gap-2">
                <span>See All Deals {selectedBudget.label}</span>
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
