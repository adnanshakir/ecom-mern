"use client";

import { usePublicProducts } from "@/hooks/storefront/usePublicProducts";
import { ProductCard } from "@/components/storefront/products/ProductCard";
import { Loader2 } from "lucide-react";

export function ExploreProducts({ excludeProductId, excludeCategoryId }) {
  const { products, loading } = usePublicProducts({ limit: 24, sort: "newest" });

  const otherCategoryProducts = products.filter(
    (p) =>
      p._id !== excludeProductId &&
      p.category?._id !== excludeCategoryId &&
      p.category !== excludeCategoryId
  );

  const displayProducts = (
    otherCategoryProducts.length >= 4
      ? otherCategoryProducts
      : products.filter((p) => p._id !== excludeProductId)
  ).slice(0, 18);

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
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-xs font-medium">Loading products...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {displayProducts.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

