"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Loader2, PackageX } from "lucide-react";
import { usePublicProducts } from "@/hooks/storefront/usePublicProducts";
import { usePublicCategories } from "@/hooks/storefront/usePublicCategories";
import { ProductCard } from "@/components/storefront/ProductCard";
import { Button } from "@/components/ui/button";

export function PopularProductsSection() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const { categories } = usePublicCategories();

  const { products, loading, error } = usePublicProducts({
    category: selectedCategory,
    limit: 12,
  });

  // Top level categories to display as filter pills
  const topCategories = categories.filter((cat) => !cat.parent);

  return (
    <section className="space-y-6">
      {/* Header & View All */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Popular Products
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Top trending items and best wholesale deals
          </p>
        </div>

        <Button variant="outline" size="sm" asChild className="self-start rounded-full border-[#033936] text-[#033936] hover:bg-[#033936] hover:text-white sm:self-auto">
          <Link href="/catalog" className="flex items-center gap-1">
            <span>View All Products</span>
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setSelectedCategory(null)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
            selectedCategory === null
              ? "bg-[#033936] text-white shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          All
        </button>

        {topCategories.map((cat) => {
          const isSelected = selectedCategory === cat.slug || selectedCategory === cat._id;
          return (
            <button
              key={cat._id}
              type="button"
              onClick={() => setSelectedCategory(cat.slug || cat._id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                isSelected
                  ? "bg-[#033936] text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="size-7 animate-spin text-[#033936]" />
          <p className="text-sm font-medium">Loading products...</p>
        </div>
      ) : error ? (
        <div className="py-12 text-center text-sm text-destructive">{error}</div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <PackageX className="mb-2 size-10 text-muted-foreground/60" />
          <p className="text-sm font-medium">No products found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
          {products.slice(0, 12).map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
