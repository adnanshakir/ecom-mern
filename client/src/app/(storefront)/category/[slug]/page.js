"use client";

import { use } from "react";
import { usePublicCategories } from "@/hooks/storefront/usePublicCategories";
import { ProductCatalogFilterView } from "@/components/storefront/products/ProductCatalogFilterView";

export default function CategoryPage({ params }) {
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
        { label: "Catalog", href: "/catalog" },
        ...(currentCategory ? [{ label: currentCategory.name }] : []),
      ]}
    />
  );
}
