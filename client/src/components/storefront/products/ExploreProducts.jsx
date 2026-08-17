"use client";

import { usePublicProducts } from "@/hooks/storefront/usePublicProducts";
import { ProductCard } from "@/components/storefront/products/ProductCard";

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

  if (loading || displayProducts.length === 0) return null;

  return (
    <div className="grid gap-4 pt-8 border-t">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Explore Other Products
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Discover trending wholesale items from across our full catalog.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 sm:gap-6">
        {displayProducts.slice(0, 12).map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </div>
  );
}
