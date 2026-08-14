"use client";

import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { usePublicCategories } from "@/hooks/storefront/usePublicCategories";
import { ProductCatalogFilterView } from "@/components/storefront/ProductCatalogFilterView";

export default function CategoryPage() {
  const { slug } = useParams();
  const { categories, loading: categoriesLoading } = usePublicCategories();

  if (categoriesLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-[#033936]" />
        Loading category...
      </div>
    );
  }

  const activeCategorySlug = (slug === "allcategories" || slug === "all") ? null : slug;

  const currentCategory = categories.find(
    (c) => c.slug === activeCategorySlug || c._id === activeCategorySlug
  );

  return (
    <ProductCatalogFilterView
      initialCategory={activeCategorySlug}
      titleOverride={currentCategory ? currentCategory.name : undefined}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Catalog", href: "/catalog" },
        ...(currentCategory ? [{ label: currentCategory.name }] : []),
      ]}
    />
  );
}
