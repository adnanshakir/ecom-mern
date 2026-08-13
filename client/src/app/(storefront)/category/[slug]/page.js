"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, FolderTree } from "lucide-react";
import { usePublicCategories } from "@/hooks/storefront/usePublicCategories";
import { buildChildrenMap } from "@/lib/categoryTree";
import { ProductGrid } from "@/components/storefront/ProductGrid";
import { Breadcrumbs } from "@/components/storefront/Breadcrumbs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CategoryPage() {
  const { slug } = useParams();
  const { categories, loading: categoriesLoading } = usePublicCategories();
  const [sort, setSort] = useState("newest");

  if (categoriesLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Loading category...
      </div>
    );
  }

  const currentCategory = categories.find(
    (c) => c.slug === slug || c._id === slug
  );

  if (!currentCategory) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <p className="text-lg font-medium text-destructive">Category not found</p>
        <Link href="/" className="mt-4 inline-block text-sm text-primary hover:underline">
          Return to home
        </Link>
      </div>
    );
  }

  const childrenMap = buildChildrenMap(categories);
  const subcategories = childrenMap.get(currentCategory._id) || [];

  // Breadcrumbs path
  const breadcrumbItems = [{ label: "Home", href: "/" }];
  if (currentCategory.parent) {
    const parentCat = categories.find((c) => c._id === (currentCategory.parent._id || currentCategory.parent));
    if (parentCat) {
      breadcrumbItems.push({
        label: parentCat.name,
        href: `/category/${parentCat.slug || parentCat._id}`,
      });
    }
  }
  breadcrumbItems.push({ label: currentCategory.name });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mt-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{currentCategory.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Showing products under {currentCategory.name}
            {subcategories.length > 0 ? ` and its subcategories` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Sort by:</span>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price_asc">Price: Low to High</SelectItem>
              <SelectItem value="price_desc">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Subcategory Pills Navigation */}
      {subcategories.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-3">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <FolderTree className="size-3.5" /> Subcategories:
          </span>
          {subcategories.map((sub) => (
            <Link
              key={sub._id}
              href={`/category/${sub.slug || sub._id}`}
              className="rounded-full bg-background px-3 py-1 text-xs font-medium border text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {sub.name}
            </Link>
          ))}
        </div>
      )}

      {/* Filtered Product Grid */}
      <ProductGrid category={currentCategory._id} sort={sort} />
    </div>
  );
}
