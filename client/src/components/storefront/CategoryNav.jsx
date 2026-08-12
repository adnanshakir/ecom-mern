"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { usePublicCategories } from "@/hooks/storefront/usePublicCategories";
import { buildChildrenMap } from "@/lib/categoryTree";

export function CategoryNav() {
  const { categories, loading } = usePublicCategories();

  if (loading || categories.length === 0) return null;

  const childrenMap = buildChildrenMap(categories);
  const topLevel = childrenMap.get(null) || [];

  return (
    <nav className="border-b bg-muted/30">
      <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 sm:px-6 lg:px-8">
        {topLevel.map((category) => {
          const subcategories = childrenMap.get(category._id) || [];

          return (
            <div key={category._id} className="group relative">
              <Link
                href={`/category/${category.slug || category._id}`}
                className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {category.name}
                {subcategories.length > 0 && <ChevronDown className="size-3.5" />}
              </Link>

              {subcategories.length > 0 && (
                <div className="invisible absolute left-0 top-full z-20 min-w-48 rounded-md border bg-popover py-1 opacity-0 shadow-md transition-opacity group-hover:visible group-hover:opacity-100">
                  {subcategories.map((sub) => (
                    <Link
                      key={sub._id}
                      href={`/category/${sub.slug || sub._id}`}
                      className="block px-3 py-2 text-sm hover:bg-accent"
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}