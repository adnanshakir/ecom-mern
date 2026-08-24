"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { usePublicCategories } from "@/hooks/storefront/usePublicCategories";

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80",
];

export function ShopByCategory() {
  const { categories, loading } = usePublicCategories();

  // Top level categories from database API
  const topCategories = categories.filter((cat) => !cat.parent);
  const sourceCategories = topCategories.length > 0 ? topCategories : categories;

  // Take the first 7 categories from the backend
  const firstSeven = sourceCategories.slice(0, 7);

  const displayItems = firstSeven.map((cat, index) => {
    const imageUrl = typeof cat.image === "string" ? cat.image : cat.image?.url;
    return {
      id: cat._id || cat.slug || index,
      tag: cat.description || cat.slug?.replace(/-/g, " ").toUpperCase() || "FEATURED COLLECTION",
      title: cat.name ? cat.name.toUpperCase() : "CATEGORY",
      href: `/category/${cat.slug || cat._id}`,
      image: imageUrl || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length],
    };
  });

  const remainingCount = sourceCategories.length > 7 ? sourceCategories.length - 7 : sourceCategories.length;

  if (loading) {
    return (
      <section className="space-y-6 pt-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
            <div className="h-7 w-64 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="min-h-48.75 sm:min-h-52.5 rounded-2xl bg-muted/60 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 pt-4">
      {/* Section Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            SHOP BY CATEGORY
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Curated for retailers and shoppers
          </h2>
        </div>

        <Link
          href="/category"
          className="group inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground sm:text-sm self-start sm:self-auto"
        >
          <span>All categories</span>
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Grid: 4 columns on large screens (First 7 category cards + 1 highlight card) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {displayItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/40 bg-muted/40 p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 min-h-48.75 sm:min-h-52.5"
          >
            {/* Background image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image}
              alt={item.title}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Text readable gradient overlay */}
            <div className="absolute inset-0 bg-linear-to-b from-white/80 via-white/45 to-white/10 dark:from-slate-950/85 dark:via-slate-950/50 dark:to-slate-950/20 pointer-events-none" />

            {/* Category tag & name */}
            <div className="relative z-10">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 line-clamp-1">
                {item.tag}
              </p>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5 leading-tight line-clamp-1">
                {item.title}
              </h3>
            </div>

            {/* Bottom-left Circular Arrow Button (ONLY VISIBLE ON HOVER) */}
            <div className="relative z-10 mt-auto pt-4">
              <div className="flex size-8 sm:size-9 items-center justify-center rounded-full bg-white text-slate-900 shadow-md opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                <ArrowUpRight className="size-4 stroke-[2.5]" />
              </div>
            </div>
          </Link>
        ))}

        {/* 8th Highlight Card: Explore All Categories */}
        <Link
          href="/category"
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-[#0B192C] p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 min-h-48.75 sm:min-h-52.5"
        >
          {/* Header */}
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
              EXPLORE ALL
            </p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight mt-2">
              {remainingCount}+ more categories
            </h3>
          </div>

          {/* Bottom-left Yellow Circular Arrow Button */}
          <div className="relative z-10 mt-auto pt-4">
            <div className="flex size-9 sm:size-10 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-md transition-transform duration-300 group-hover:scale-110">
              <ArrowUpRight className="size-5 stroke-[2.5]" />
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
