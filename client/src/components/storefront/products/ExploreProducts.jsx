"use client";

import { useMemo } from "react";
import { usePublicProducts } from "@/hooks/storefront/usePublicProducts";
import { ProductCard } from "@/components/storefront/products/ProductCard";
import { ProductCardSkeleton } from "@/components/storefront/products/ProductCardSkeleton";

export function ExploreProducts({ excludeProductId, excludeCategoryId }) {
  const { products, loading } = usePublicProducts({ limit: 80 });

  // Randomize products every time the section loads / receives data
  const displayProducts = useMemo(() => {
    if (!products || products.length === 0) return [];

    const otherCategoryProducts = products.filter(
      (p) =>
        p._id !== excludeProductId &&
        p.category?._id !== excludeCategoryId &&
        p.category !== excludeCategoryId
    );

    const pool =
      otherCategoryProducts.length >= 4
        ? otherCategoryProducts
        : products.filter((p) => p._id !== excludeProductId);

    // Fisher-Yates shuffle for true randomness
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, 20);
  }, [products, excludeProductId, excludeCategoryId]);

  if (!loading && displayProducts.length === 0) return null;

  return (
    <div className="space-y-4 pt-8 border-t w-full min-w-0">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Explore
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Discover trending wholesale items from across our full catalog.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:gap-6">
          {Array.from({ length: 15 }).map((_, idx) => (
            <ProductCardSkeleton key={idx} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:gap-6">
          {displayProducts.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

