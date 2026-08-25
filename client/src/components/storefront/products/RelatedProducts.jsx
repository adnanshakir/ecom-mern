"use client";

import { usePublicProducts } from "@/hooks/storefront/usePublicProducts";
import { ProductScrollRow } from "@/components/storefront/products/ProductScrollRow";

export function RelatedProducts({ categoryId, excludeProductId }) {
  const { products, loading } = usePublicProducts({ category: categoryId, limit: 12 });
  const related = products.filter((p) => p._id !== excludeProductId);

  if (!loading && related.length === 0) return null;

  return (
    <div className="space-y-4 pt-8 border-t w-full min-w-0">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Related Products
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          More items from the same category you might like.
        </p>
      </div>

      <ProductScrollRow products={related.slice(0, 10)} loading={loading} />
    </div>
  );
}

