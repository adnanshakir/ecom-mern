"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { usePublicCategories } from "@/hooks/storefront/usePublicCategories";
import { ProductCatalogFilterView } from "@/components/storefront/products/ProductCatalogFilterView";

function CategoryContent({ slug }) {
  const activeCategorySlug = (slug === "allcategories" || slug === "all") ? null : slug;
  const { categories } = usePublicCategories();

  const findInTree = (list, target) => {
    if (!Array.isArray(list)) return null;
    for (const c of list) {
      if (!c) continue;
      if (c.slug === target || c._id === target) return c;
      if (Array.isArray(c.subcategories) && c.subcategories.length > 0) {
        const found = findInTree(c.subcategories, target);
        if (found) return found;
      }
    }
    return null;
  };

  const currentCategory = activeCategorySlug
    ? findInTree(categories, activeCategorySlug)
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

export function CategoryPageClient({ slug }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-[#033936]" />
        </div>
      }
    >
      <CategoryContent slug={slug} />
    </Suspense>
  );
}
