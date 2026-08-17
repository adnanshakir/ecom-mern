"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { usePublicBanners } from "@/hooks/storefront/usePublicBanners";

export function CategoryBanners() {
  const { banners: allBanners } = usePublicBanners();
  const left = allBanners["secondary-left"] || {};
  const right = allBanners["secondary-right"] || {};

  const leftImage = (left.image?.url || "/secondary-left.webp").replace(/\.png$/, ".webp");
  const rightImage = (right.image?.url || "/secondary-ryt.webp").replace(/\.png$/, ".webp");

  const banners = [
    {
      id: "secondary-left",
      title: left.title || "Jewellery",
      subtitle: left.subtitle || "Premium collection for every occasion",
      image: leftImage,
      href: left.href || "/catalog/jewellery",
      ctaText: left.ctaText || "Explore Now",
      showGradient: left.showGradient ?? true,
      overlayColor: left.overlayColor || "background",
      placement: left.placement || "left",
    },
    {
      id: "secondary-right",
      title: right.title || "Mobile Accessories",
      subtitle: right.subtitle || "Trendy accessories for smart devices",
      image: rightImage,
      href: right.href || "/catalog/mobile-accessories",
      ctaText: right.ctaText || "Explore Now",
      showGradient: right.showGradient ?? true,
      overlayColor: right.overlayColor || "background",
      placement: right.placement || "left",
    },
  ];

  return (
    <section className="grid gap-6 md:grid-cols-2">
      {banners.map((banner) => {
        const isRight = banner.placement === "right";

        return (
          <div
            key={banner.id}
            className="group relative flex min-h-[220px] overflow-hidden rounded-2xl border bg-card shadow-sm sm:min-h-[240px]"
          >
            {/* Background image & gradient overlay */}
            <div className="absolute inset-0 z-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={banner.image}
                alt={banner.title}
                loading="lazy"
                decoding="async"
                className="size-full object-cover object-center"
              />
              {banner.showGradient && (
                banner.overlayColor && banner.overlayColor.startsWith("#") ? (
                  <div
                    className={`absolute inset-0 sm:w-3/4 ${
                      isRight ? "right-0 left-auto sm:ml-auto" : "left-0 right-auto"
                    }`}
                    style={{
                      background: isRight
                        ? `linear-gradient(to left, ${banner.overlayColor}F2, ${banner.overlayColor}D9 40%, transparent)`
                        : `linear-gradient(to right, ${banner.overlayColor}F2, ${banner.overlayColor}D9 40%, transparent)`,
                    }}
                  />
                ) : (
                  <div
                    className={`absolute inset-0 sm:w-3/4 ${
                      isRight
                        ? "right-0 left-auto bg-gradient-to-l from-background/95 via-background/85 to-transparent sm:ml-auto"
                        : "left-0 right-auto bg-gradient-to-r from-background/95 via-background/85 to-transparent"
                    }`}
                  />
                )
              )}
            </div>

            {/* Card Content */}
            <div
              className={`relative z-10 flex flex-col justify-center p-6 sm:p-8 sm:w-2/3 ${
                isRight ? "ml-auto text-right items-end" : "text-left items-start"
              }`}
            >
              <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {banner.title}
              </h3>
              <p className="mt-2 text-xs font-normal text-muted-foreground sm:text-sm">
                {banner.subtitle}
              </p>

              <div className="mt-6">
                <Link
                  href={banner.href}
                  className="inline-flex items-center gap-2 rounded-full bg-[#033936] px-5 py-2 text-xs font-semibold text-white shadow transition-all duration-200 hover:bg-[#022a28] hover:gap-3 sm:text-sm"
                >
                  <span>{banner.ctaText}</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
