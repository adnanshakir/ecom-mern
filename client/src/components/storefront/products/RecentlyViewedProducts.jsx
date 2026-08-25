"use client";

import { useRecentlyViewed } from "@/hooks/storefront/useRecentlyViewed";
import { ProductScrollRow } from "@/components/storefront/products/ProductScrollRow";

export function RecentlyViewedProducts({ currentProductId }) {
  const { recentlyViewed } = useRecentlyViewed();

  // Exclude current product if provided
  const items = currentProductId
    ? recentlyViewed.filter((p) => p._id !== currentProductId)
    : recentlyViewed;

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 pt-8 border-t w-full min-w-0">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Recently Viewed Products
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Items you recently looked at.
        </p>
      </div>

      <ProductScrollRow products={items} />
    </div>
  );
}
