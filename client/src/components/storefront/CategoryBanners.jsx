"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CategoryBanners() {
  const banners = [
    {
      id: "jewellery",
      title: "Jewellery",
      subtitle: "Premium collection for every occasion",
      image: "/Jewellery_banner.png",
      href: "/catalog?category=Jewellery",
      bgGradient: "from-amber-500/10 via-rose-500/5 to-transparent",
    },
    {
      id: "mobile-accessories",
      title: "Mobile Accessories",
      subtitle: "Trendy accessories for smart devices",
      image: "/Mobile_accessories_banner.png",
      href: "/catalog?category=Mobile%20Accessories",
      bgGradient: "from-sky-500/10 via-slate-500/5 to-transparent",
    },
  ];

  return (
    <section className="grid gap-6 md:grid-cols-2">
      {banners.map((banner) => (
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
              className="size-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-transparent sm:w-3/4" />
          </div>

          {/* Card Content */}
          <div className="relative z-10 flex flex-col justify-center p-6 sm:p-8 sm:w-2/3">
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
                <span>Explore Now</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
