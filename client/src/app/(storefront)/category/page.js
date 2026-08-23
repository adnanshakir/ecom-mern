"use client";

import Link from "next/link";
import { ArrowUpRight, Image, Loader2 } from "lucide-react";
import { usePublicCategories } from "@/hooks/storefront/usePublicCategories";
import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs } from "@/components/storefront/layout/Breadcrumbs";

export default function CategoryIndexPage() {
  const { categories, loading, error } = usePublicCategories({ parentOnly: true });

  // Safety filter to ensure only parent categories are rendered
  const parentCategories = (categories || []).filter((category) => !category.parent);

  return (
    <PageContainer className="space-y-8 py-8">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Categories" }]} />

      {/* Header */}
      <div className="border-b pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Categories
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Explore our product categories. Select any category to view all available products and bulk deals.
        </p>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-[#033936]" />
          <p className="text-sm font-medium">Loading categories...</p>
        </div>
      ) : error ? (
        <div className="py-12 text-center text-sm text-destructive">
          {error}
        </div>
      ) : parentCategories.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No categories found.
        </div>
      ) : (
        /* Categories Grid (Displaying Parent Categories Only) */
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-6">
          {parentCategories.map((category) => {
            const imageUrl = category.image?.url;

            return (
              <Link
                key={category._id}
                href={`/category/${category.slug || category._id}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-xs transition-all duration-200 hover:border-[#033936] hover:shadow-md"
              >
                {/* Image Box (aspect-square) */}
                <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt={category.name}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    /* Empty State Handler for Categories without custom image */
                    <CategoryPlaceholder categoryName={category.name} />
                  )}

                  {/* Arrow badge */}
                  <div className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-background/80 text-foreground shadow-xs opacity-0 transition-opacity group-hover:opacity-100">
                    <ArrowUpRight className="size-4" />
                  </div>
                </div>

                {/* Simple Title Below Image */}
                <div className="flex flex-1 items-center justify-center p-3 text-center">
                  <h3 className="line-clamp-2 text-xs font-bold text-foreground sm:text-sm group-hover:text-[#033936] dark:group-hover:text-emerald-400">
                    {category.name}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}

{/* Category Empty Image Placeholder */}
function CategoryPlaceholder({ categoryName }) {
  return (
    <div className="relative flex size-full flex-col items-center justify-center bg-gradient-to-br from-[#033936]/15 via-[#033936]/5 to-slate-200 p-4 text-center dark:from-[#033936]/40 dark:to-slate-900">
      <Image size={40} color="white" />
    </div>
  );
}
