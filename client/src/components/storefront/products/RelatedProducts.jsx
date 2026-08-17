"use client";

import { usePublicProducts } from "@/hooks/storefront/usePublicProducts";
import { ProductCard } from "@/components/storefront/products/ProductCard";

export function RelatedProducts({ categoryId, excludeProductId }) {
  const { products, loading } = usePublicProducts({ category: categoryId, limit: 10 });
  const related = products.filter((p) => p._id !== excludeProductId);

  if (loading || related.length === 0) return null;

  return (
    <div className="grid gap-4 pt-8 border-t">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Related Products
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          More items from the same category you might like.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 sm:gap-6">
        {related.slice(0, 8).map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </div>
  );
}
