"use client";

import { usePublicProducts } from "@/hooks/storefront/usePublicProducts";
import { ProductCard } from "@/components/storefront/ProductCard";

export function RelatedProducts({ categoryId, excludeProductId }) {
  const { products, loading } = usePublicProducts({ category: categoryId, limit: 8 });
  const related = products.filter((p) => p._id !== excludeProductId);

  if (loading || related.length === 0) return null;

  return (
    <div className="grid gap-4">
      <h2 className="text-lg font-semibold">Related products</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {related.slice(0, 5).map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </div>
  );
}