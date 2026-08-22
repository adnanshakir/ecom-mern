"use client";

import { use } from "react";
import { Loader2 } from "lucide-react";
import { usePublicProduct } from "@/hooks/storefront/usePublicProduct";
import { ProductGallery } from "@/components/storefront/products/ProductGallery";
import { ProductInteractiveSection } from "@/components/storefront/products/ProductInteractiveSection";
import { RelatedProducts } from "@/components/storefront/products/RelatedProducts";
import { ExploreProducts } from "@/components/storefront/products/ExploreProducts";
import { Breadcrumbs } from "@/components/storefront/layout/Breadcrumbs";

export default function ProductPage({ params }) {
  const { slug } = use(params);
  const { product, loading, error } = usePublicProduct(slug);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-[#033936]" />
        <p className="text-sm font-medium">Loading product...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="py-20 text-center text-sm text-destructive">
        Product not found
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-400 px-4 py-6 sm:px-6 lg:px-8 space-y-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          {
            label: product.category?.name || "Catalog",
            href: `/catalog/${product.category?.slug || product.category?._id || "all"}`,
          },
          { label: product.name },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-[580px_1fr] xl:grid-cols-[640px_1fr]">
        <ProductGallery productImages={product.images} />
        <ProductInteractiveSection product={product} />
      </div>

      {/* Section 1: Related Products */}
      <RelatedProducts categoryId={product.category?._id} excludeProductId={product._id} />

      {/* Section 2: Explore Other Products */}
      <ExploreProducts excludeProductId={product._id} excludeCategoryId={product.category?._id} />
    </div>
  );
}
