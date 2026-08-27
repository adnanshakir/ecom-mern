"use client";

import Link from "next/link";
import { usePublicBanners } from "@/hooks/storefront/usePublicBanners";
import { Skeleton } from "@/components/ui/skeleton";

export function ShopByBudget() {
  const { banners, loading } = usePublicBanners();

  const budgetSlides = (banners.budget?.slides || []).filter((slide) => slide.isActive !== false);

  return (
    <section className="space-y-6 ">
      {/* Budget Banner Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="relative aspect-4/3 sm:aspect-square w-full overflow-hidden rounded-2xl border border-border/40 bg-card p-1.5 shadow-2xs"
            >
              <Skeleton className="size-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {budgetSlides.map((slide, idx) => {
            const href = slide.href || "/category/all";
            const rawImageUrl = slide.image?.url || "";
            const imageUrl =
              typeof rawImageUrl === "string" && (rawImageUrl.startsWith("/") || !rawImageUrl.startsWith("http"))
                ? rawImageUrl.replace(/\.(png|webp)$/i, ".webp")
                : rawImageUrl;

            return (
              <Link
                key={slide._id || idx}
                href={href}
                className="group relative block overflow-hidden rounded-2xl border border-border/50 bg-card shadow-xs transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div className="relative aspect-4/3 sm:aspect-square w-full overflow-hidden bg-muted">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt={`Shop by Budget ${idx + 1}`}
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-muted text-muted-foreground text-sm font-semibold">
                      Budget Banner #{idx + 1}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
