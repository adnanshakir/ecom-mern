"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Loader2, PackageX } from "lucide-react";
import { ProductCard } from "@/components/storefront/products/ProductCard";

export function ProductScrollRow({
  products = [],
  loading = false,
  error = null,
  emptyMessage = "No products found.",
  itemClassName = "w-48 sm:w-60 md:w-[260px] shrink-0",
}) {
  const scrollContainerRef = useRef(null);
  const [showLeftMask, setShowLeftMask] = useState(false);
  const [showRightMask, setShowRightMask] = useState(true);

  const checkScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftMask(scrollLeft > 5);
      setShowRightMask(scrollLeft < scrollWidth - clientWidth - 5);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);
      return () => {
        el.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, [products, checkScroll]);

  const handleScroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -260 : 260;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-[#033936]" />
        <p className="text-xs font-medium">Loading products...</p>
      </div>
    );
  }

  if (error || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <PackageX className="mb-2 size-8 text-muted-foreground/60" />
        <p className="text-xs font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="group/products relative w-full min-w-0">
      {/* Reduced Left Masking Overlay */}
      <div
        className={`pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-3 sm:w-5 bg-linear-to-r from-background/80 to-transparent transition-opacity duration-300 ${
          showLeftMask ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* Reduced Right Masking Overlay */}
      <div
        className={`pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-3 sm:w-5 bg-linear-to-l from-background/80 to-transparent transition-opacity duration-300 ${
          showRightMask ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Circular Arrow Buttons */}
      {showLeftMask && (
        <button
          type="button"
          onClick={() => handleScroll("left")}
          aria-label="Scroll left"
          className="absolute left-1 top-1/2 -translate-y-1/2 z-20 size-8 items-center justify-center rounded-full bg-white text-slate-900 border border-slate-200/80 shadow-md transition-all duration-200 hover:scale-110 active:scale-95 opacity-0 group-hover/products:opacity-100 flex"
        >
          <ChevronLeft className="size-4 stroke-[2.2]" />
        </button>
      )}
      {showRightMask && (
        <button
          type="button"
          onClick={() => handleScroll("right")}
          aria-label="Scroll right"
          className="absolute right-1 top-1/2 -translate-y-1/2 z-20 size-8 items-center justify-center rounded-full bg-white text-slate-900 border border-slate-200/80 shadow-md transition-all duration-200 hover:scale-110 active:scale-95 opacity-0 group-hover/products:opacity-100 flex"
        >
          <ChevronRight className="size-4 stroke-[2.2]" />
        </button>
      )}

      {/* Scrollable Container */}
      <div
        ref={scrollContainerRef}
        className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto py-2 px-0.5 scroll-smooth scrollbar-none [&::-webkit-scrollbar]:hidden w-full min-w-0"
      >
        {products.map((product) => (
          <div key={product._id} className={itemClassName}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
}
