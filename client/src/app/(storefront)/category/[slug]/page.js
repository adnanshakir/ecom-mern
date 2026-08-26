"use client";

import { use, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { usePublicCategories } from "@/hooks/storefront/usePublicCategories";
import { ProductCatalogFilterView } from "@/components/storefront/products/ProductCatalogFilterView";

function CategoryContent({ params }) {
  const { slug } = use(params);
  const activeCategorySlug = (slug === "allcategories" || slug === "all") ? null : slug;
  const { categories } = usePublicCategories();

  const currentCategory = activeCategorySlug
    ? categories.find((c) => c.slug === activeCategorySlug || c._id === activeCategorySlug) || null
    : null;

  return (
    <ProductCatalogFilterView
      initialCategory={activeCategorySlug}
      titleOverride={currentCategory ? currentCategory.name : undefined}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Categories", href: "/category" },
        ...(currentCategory ? [{ label: currentCategory.name }] : []),
      ]}
    />
  );
}

export default function CategoryPage({ params }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-[#033936]" />
        </div>
      }
    >
      <CategoryContent params={params} />
    </Suspense>
  );
}
