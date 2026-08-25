"use client";

import { usePublicProducts } from "@/hooks/storefront/usePublicProducts";
import { ProductScrollRow } from "@/components/storefront/products/ProductScrollRow";

export function ExploreProducts({ excludeProductId, excludeCategoryId }) {
  const { products, loading } = usePublicProducts({ limit: 16, sort: "newest" });

  const otherCategoryProducts = products.filter(
    (p) =>
      p._id !== excludeProductId &&
      p.category?._id !== excludeCategoryId &&
      p.category !== excludeCategoryId
  );

  const displayProducts =
    otherCategoryProducts.length >= 4
      ? otherCategoryProducts
      : products.filter((p) => p._id !== excludeProductId);

  if (!loading && displayProducts.length === 0) return null;

  return (
    <div className="space-y-4 pt-8 border-t w-full min-w-0">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Explore Other Products
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Discover trending wholesale items from across our full catalog.
        </p>
      </div>

      <ProductScrollRow products={displayProducts.slice(0, 12)} loading={loading} />
    </div>
  );
}

