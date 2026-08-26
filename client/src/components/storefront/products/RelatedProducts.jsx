"use client";

import { usePublicProducts } from "@/hooks/storefront/usePublicProducts";
import { ProductCard } from "@/components/storefront/products/ProductCard";
import { Loader2 } from "lucide-react";

export function RelatedProducts({ categoryId, excludeProductId }) {
  const { products, loading } = usePublicProducts({ category: categoryId, limit: 16 });
  const related = products.filter((p) => p._id !== excludeProductId).slice(0, 12);

  if (!loading && related.length === 0) return null;

  return (
    <div className="space-y-4 pt-8 border-t w-full min-w-0">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          You May Also Like
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          More items from the same category you might like.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-xs font-medium">Loading recommendations...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {related.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

