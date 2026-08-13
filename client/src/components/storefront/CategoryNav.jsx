"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, MoreHorizontal } from "lucide-react";
import { usePublicCategories } from "@/hooks/storefront/usePublicCategories";
import { buildChildrenMap } from "@/lib/categoryTree";

const MAX_VISIBLE = 8;

export function CategoryNav() {
  const { categories, loading } = usePublicCategories();

  if (loading || categories.length === 0) return null;

  const childrenMap = buildChildrenMap(categories);
  const topLevel = childrenMap.get(null) || [];

  const visibleCategories = topLevel.slice(0, MAX_VISIBLE);
  const moreCategories = topLevel.slice(MAX_VISIBLE);

  return (
    <nav className="border-b bg-muted/30">
      <div className="mx-auto flex flex-wrap max-w-7xl items-center gap-0.5 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-1 px-2.5 py-1.5 font-semibold text-foreground hover:bg-accent rounded-md shrink-0"
        >
          All Products
        </Link>

        {/* Primary Visible Categories */}
        {visibleCategories.map((category) => {
          const subcategories = childrenMap.get(category._id) || [];

          return (
            <div key={category._id} className="group relative">
              <Link
                href={`/category/${category.slug || category._id}`}
                className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {category.name}
                {subcategories.length > 0 && <ChevronDown className="size-3" />}
              </Link>

              {subcategories.length > 0 && (
                <div className="invisible absolute left-0 top-full z-20 min-w-44 rounded-md border bg-popover py-1 opacity-0 shadow-md transition-opacity group-hover:visible group-hover:opacity-100">
                  {subcategories.map((sub) => (
                    <Link
                      key={sub._id}
                      href={`/category/${sub.slug || sub._id}`}
                      className="block px-2.5 py-1.5 text-xs hover:bg-accent"
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* More Categories Dropdown */}
        {moreCategories.length > 0 && (
          <div className="group relative ml-auto sm:ml-0">
            <button className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
              <span>More</span>
              <ChevronDown className="size-3" />
            </button>

            <div className="invisible absolute right-0 top-full z-20 min-w-52 max-h-96 overflow-y-auto rounded-md border bg-popover py-1 opacity-0 shadow-md transition-opacity group-hover:visible group-hover:opacity-100">
              {moreCategories.map((category) => {
                const subcategories = childrenMap.get(category._id) || [];
                return (
                  <div key={category._id} className="group/sub relative border-b last:border-0 border-border/40">
                    <Link
                      href={`/category/${category.slug || category._id}`}
                      className="flex items-center justify-between px-3 py-2 text-xs font-medium hover:bg-accent"
                    >
                      <span>{category.name}</span>
                      {subcategories.length > 0 && <ChevronRight className="size-3 text-muted-foreground" />}
                    </Link>

                    {subcategories.length > 0 && (
                      <div className="hidden group-hover/sub:block bg-muted/40 px-3 py-1">
                        {subcategories.map((sub) => (
                          <Link
                            key={sub._id}
                            href={`/category/${sub.slug || sub._id}`}
                            className="block py-1 text-xs text-muted-foreground hover:text-foreground"
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
          </div>
        )}
      </div>
    </nav>
  );
}
