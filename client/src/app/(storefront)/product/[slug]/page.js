"use client";

import { use, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { usePublicProduct } from "@/hooks/storefront/usePublicProduct";
import { useRecentlyViewed } from "@/hooks/storefront/useRecentlyViewed";
import { useVariantSelector } from "@/hooks/storefront/useVariantSelector";
import { ProductGallery } from "@/components/storefront/products/ProductGallery";
import { ProductInteractiveSection } from "@/components/storefront/products/ProductInteractiveSection";
import { RelatedProducts } from "@/components/storefront/products/RelatedProducts";
import { ExploreProducts } from "@/components/storefront/products/ExploreProducts";
import { RecentlyViewedProducts } from "@/components/storefront/products/RecentlyViewedProducts";
import { Breadcrumbs } from "@/components/storefront/layout/Breadcrumbs";

export default function ProductPage({ params }) {
  const { slug } = use(params);
  const { product, loading, error } = usePublicProduct(slug);
  const { addRecentlyViewed } = useRecentlyViewed();
  const variantSelector = useVariantSelector(product);
  const { selectedVariant } = variantSelector;

  // Save product to recently viewed list whenever product loads
  useEffect(() => {
    if (product) {
      addRecentlyViewed(product);
    }
  }, [product, addRecentlyViewed]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-[#033936]" />
        <p className="text-sm font-medium">Loading product...</p>
      </div>
    );
  }

  if (error || !product) {
    return <div className="py-20 text-center text-sm text-destructive">Product not found</div>;
  }

  return (
    <div className="mx-auto max-w-[1600px] w-full min-w-0 px-4 py-6 sm:px-6 lg:px-8 space-y-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          {
            label: product.category?.name || "Categories",
            href: `/category/${product.category?.slug || product.category?._id || "all"}`,
          },
          { label: product.name },
        ]}
      />

      {/* Balanced 50/50 Grid Layout */}
      <div className="grid gap-8 lg:gap-12 grid-cols-1 lg:grid-cols-12 items-start min-w-0">
        <div className="lg:col-span-6 min-w-0 w-full">
          <ProductGallery
            productImages={product.images}
            variantImages={selectedVariant?.images}
            allVariants={product.variants}
          />
        </div>
        <div className="lg:col-span-6 min-w-0 w-full">
          <ProductInteractiveSection
            product={product}
            variantSelectorProps={variantSelector}
          />
        </div>
      </div>

      {/* Section 1: Related Products */}
      <RelatedProducts categoryId={product.category?._id} excludeProductId={product._id} />

      {/* Section 2: Explore Other Products */}
      <ExploreProducts excludeProductId={product._id} excludeCategoryId={product.category?._id} />

      {/* Section 3: Recently Viewed Products */}
      <RecentlyViewedProducts currentProductId={product._id} />
    </div>
  );
}
